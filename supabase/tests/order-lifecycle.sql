-- ===========================================================================
-- Exercises the full order lifecycle against the real schema, then rolls the
-- whole thing back. Nothing below is committed — stock, orders and references
-- are all restored on exit, so it is safe to run against production.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/order-lifecycle.sql
-- ===========================================================================

\set ON_ERROR_STOP on
begin;

\echo ''
\echo '--- 1. Catalogue seeded -----------------------------------------------'
select id, name, price_pence from public.products order by id;
select product_id, size, stock from public.product_variants order by product_id, sort_order;
select id, zone, label, price_pence from public.shipping_rates order by zone, sort_order;

\echo ''
\echo '--- 2. place_order prices the bag itself -------------------------------'
-- Two Pearls in S (2 x 32500) and one Florence in M (35000) = 100000 pence.
with placed as (
  select public.place_order(
    '[{"productId":"the-pearl","size":"S","quantity":2},
      {"productId":"the-florence","size":"M","quantity":1}]'::jsonb,
    'uk',
    'test@example.com'
  ) as o
)
select
  (o ->> 'subtotalPence')::int = 100000 as subtotal_is_correct,
  jsonb_array_length(o -> 'items') = 2     as both_lines_priced,
  o ->> 'reference'                        as reference,
  o -> 'items'                             as items
from placed;

\echo ''
\echo '--- 3. A price sent by the client is ignored ----------------------------'
-- The extra keys below are exactly what a tampered bag would carry.
select (public.place_order(
  '[{"productId":"the-pearl","size":"S","quantity":1,"price":1,"unitPricePence":1}]'::jsonb,
  'uk'
) ->> 'subtotalPence')::int = 32500 as tampered_price_ignored;

\echo ''
\echo '--- 4. Refusals --------------------------------------------------------'
do $$
declare
  cases text[][] := array[
    array['empty bag',          '[]'],
    array['unknown product',    '[{"productId":"not-a-dress","size":"S","quantity":1}]'],
    array['unknown size',       '[{"productId":"the-pearl","size":"XXL","quantity":1}]'],
    array['zero quantity',      '[{"productId":"the-pearl","size":"S","quantity":0}]'],
    array['over the line cap',  '[{"productId":"the-pearl","size":"S","quantity":10}]'],
    array['insufficient stock', '[{"productId":"the-pearl","size":"XS","quantity":9}]'],
    array['duplicate line',     '[{"productId":"the-pearl","size":"S","quantity":1},{"productId":"the-pearl","size":"S","quantity":1}]']
  ];
  c text[];
begin
  foreach c slice 1 in array cases loop
    begin
      perform public.place_order(c[2]::jsonb, 'uk');
      raise exception 'FAIL: % was accepted and should not have been', c[1];
    exception
      when others then
        if sqlerrm like 'FAIL:%' then raise; end if;
        raise notice 'refused (%) -> %', c[1], sqlerrm;
    end;
  end loop;

  begin
    perform public.place_order('[{"productId":"the-pearl","size":"S","quantity":1}]'::jsonb, 'mars');
    raise exception 'FAIL: an invalid shipping zone was accepted';
  exception
    when others then
      if sqlerrm like 'FAIL:%' then raise; end if;
      raise notice 'refused (bad zone) -> %', sqlerrm;
  end;
end
$$;

\echo ''
\echo '--- 5. Payment: stock moves exactly once -------------------------------'
do $$
declare
  v_order_id  uuid;
  v_before    integer;
  v_after     integer;
  v_second    integer;
  v_result    jsonb;
begin
  select (public.place_order(
    '[{"productId":"the-pearl","size":"M","quantity":3}]'::jsonb, 'uk', 'buyer@example.com'
  ) ->> 'id')::uuid into v_order_id;

  update public.orders set stripe_session_id = 'cs_test_lifecycle' where id = v_order_id;

  select stock into v_before from public.product_variants
   where product_id = 'the-pearl' and size = 'M';

  v_result := public.mark_order_paid(
    p_session_id       => 'cs_test_lifecycle',
    p_payment_intent   => 'pi_test_lifecycle',
    p_email            => 'buyer@example.com',
    p_customer_name    => 'A Buyer',
    p_shipping_method  => 'Complimentary UK Delivery',
    p_shipping_pence   => 0,
    p_total_pence      => 97500,
    p_shipping_address => '{"line1":"1 Test Street","city":"London","postal_code":"E1 1AA","country":"GB"}'::jsonb
  );

  if (v_result ->> 'alreadyPaid')::boolean then
    raise exception 'FAIL: a first payment reported itself as already paid';
  end if;

  select stock into v_after from public.product_variants
   where product_id = 'the-pearl' and size = 'M';

  if v_after <> v_before - 3 then
    raise exception 'FAIL: stock went % -> %, expected a drop of 3', v_before, v_after;
  end if;
  raise notice 'stock committed: % -> %', v_before, v_after;

  -- Stripe redelivering the same event must change nothing.
  v_result := public.mark_order_paid(p_session_id => 'cs_test_lifecycle');

  if not (v_result ->> 'alreadyPaid')::boolean then
    raise exception 'FAIL: a replayed payment was treated as new';
  end if;

  select stock into v_second from public.product_variants
   where product_id = 'the-pearl' and size = 'M';

  if v_second <> v_after then
    raise exception 'FAIL: a replayed webhook decremented stock again (% -> %)', v_after, v_second;
  end if;
  raise notice 'replay is a no-op: stock still %', v_second;

  -- A late "expired" event must not unpick a paid order.
  perform public.mark_order_closed('cs_test_lifecycle', 'cancelled');
  if (select status from public.orders where id = v_order_id) <> 'paid' then
    raise exception 'FAIL: a late expiry event cancelled a paid order';
  end if;
  raise notice 'a late expiry event left the paid order alone';
end
$$;

\echo ''
\echo '--- 6. Overselling is survivable, not fatal ----------------------------'
do $$
declare
  v_order_id uuid;
  v_result   jsonb;
begin
  select (public.place_order(
    '[{"productId":"the-florence","size":"L","quantity":4}]'::jsonb, 'international'
  ) ->> 'id')::uuid into v_order_id;

  update public.orders set stripe_session_id = 'cs_test_shortfall' where id = v_order_id;

  -- The size sells out between checkout and payment.
  update public.product_variants set stock = 1
   where product_id = 'the-florence' and size = 'L';

  v_result := public.mark_order_paid(p_session_id => 'cs_test_shortfall', p_total_pence => 142500);

  if not ((v_result -> 'order' ->> 'stock_shortfall')::boolean) then
    raise exception 'FAIL: an oversold order was not flagged';
  end if;
  if (v_result -> 'order' ->> 'status') <> 'paid' then
    raise exception 'FAIL: an oversold order was refused rather than flagged';
  end if;
  if (select stock from public.product_variants
       where product_id = 'the-florence' and size = 'L') <> 0 then
    raise exception 'FAIL: the remaining unit was left on the shelf';
  end if;

  raise notice 'paid, flagged for the studio, shelf emptied — not refused';
end
$$;

\echo ''
\echo '--- 7. order_summary leaks nothing internal -----------------------------'
select
  not (public.order_summary('cs_test_lifecycle') ?| array[
    'stripePaymentIntent', 'stripe_payment_intent', 'stripe_customer_id',
    'stock_committed', 'id'
  ]) as summary_is_curated,
  public.order_summary('cs_test_lifecycle') ->> 'reference' as reference,
  public.order_summary('cs_test_lifecycle') ->> 'status' as status;

select public.order_summary('cs_does_not_exist') is null as unknown_session_is_null;

\echo ''
\echo '--- 8. RLS is on everywhere --------------------------------------------'
select relname, relrowsecurity as rls_enabled, relforcerowsecurity as forced
  from pg_class
 where relnamespace = 'public'::regnamespace
   and relname in ('products','product_variants','shipping_rates','orders','order_items','stripe_events')
 order by relname;

\echo ''
\echo '--- 9. anon and authenticated cannot call the money functions ----------'
select
  p.proname,
  has_function_privilege('anon',          p.oid, 'execute') as anon_can_call,
  has_function_privilege('authenticated', p.oid, 'execute') as authed_can_call,
  has_function_privilege('service_role',  p.oid, 'execute') as service_can_call
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('place_order','mark_order_paid','mark_order_closed','order_summary')
order by p.proname;

rollback;

\echo ''
\echo 'Rolled back — the database is exactly as it was.'
