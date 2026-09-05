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
  jsonb_array_length(o -> 'items') = 2  as both_lines_priced,
  (o ->> 'clientToken') is not null     as token_issued,
  o ->> 'reference'                     as reference
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
\echo '--- 5. The shipping rate is priced by the server, not the client -------'
do $$
declare
  v_token uuid;
  v_priced jsonb;
begin
  select (public.place_order(
    '[{"productId":"the-pearl","size":"S","quantity":1}]'::jsonb, 'uk'
  ) ->> 'clientToken')::uuid into v_token;

  -- The free UK rate.
  v_priced := public.prepare_payment(v_token, 'uk-standard');
  if (v_priced ->> 'totalPence')::int <> 32500 then
    raise exception 'FAIL: free UK delivery did not total 32500, got %', v_priced ->> 'totalPence';
  end if;
  raise notice 'uk-standard  -> total %', v_priced ->> 'totalPence';

  -- Next day adds exactly 795, from the table and not from the caller.
  v_priced := public.prepare_payment(v_token, 'uk-next-day');
  if (v_priced ->> 'totalPence')::int <> 33295 then
    raise exception 'FAIL: next day did not total 33295, got %', v_priced ->> 'totalPence';
  end if;
  raise notice 'uk-next-day  -> total %', v_priced ->> 'totalPence';

  -- The important one: a UK order must not be able to buy the international
  -- rate, nor an international order the free UK one.
  begin
    perform public.prepare_payment(v_token, 'international');
    raise exception 'FAIL: a UK order was allowed to pay an international rate';
  exception
    when others then
      if sqlerrm like 'FAIL:%' then raise; end if;
      raise notice 'refused (rate from the wrong zone) -> %', sqlerrm;
  end;

  begin
    perform public.prepare_payment(v_token, 'not-a-rate');
    raise exception 'FAIL: an unknown rate was accepted';
  exception
    when others then
      if sqlerrm like 'FAIL:%' then raise; end if;
      raise notice 'refused (unknown rate) -> %', sqlerrm;
  end;
end
$$;

\echo ''
\echo '--- 6. Payment: stock moves exactly once -------------------------------'
do $$
declare
  v_token  uuid;
  v_before integer;
  v_after  integer;
  v_second integer;
  v_result jsonb;
begin
  select (public.place_order(
    '[{"productId":"the-pearl","size":"M","quantity":3}]'::jsonb, 'uk', 'buyer@example.com'
  ) ->> 'clientToken')::uuid into v_token;

  perform public.prepare_payment(v_token, 'uk-standard', 'buyer@example.com');
  perform public.attach_payment_intent(v_token, 'pi_test_lifecycle');

  select stock into v_before from public.product_variants
   where product_id = 'the-pearl' and size = 'M';

  v_result := public.mark_order_paid_by_intent(
    p_payment_intent   => 'pi_test_lifecycle',
    p_email            => 'buyer@example.com',
    p_customer_name    => 'A Buyer',
    p_total_pence      => 97500,
    p_shipping_address => '{"line1":"1 Test Street","city":"London","postal_code":"E1 1AA","country":"GB"}'::jsonb
  );

  if (v_result ->> 'alreadyPaid')::boolean then
    raise exception 'FAIL: a first payment reported itself as already paid';
  end if;
  if (v_result -> 'order' ->> 'zone_mismatch')::boolean then
    raise exception 'FAIL: a GB address on a UK order was flagged as a mismatch';
  end if;

  select stock into v_after from public.product_variants
   where product_id = 'the-pearl' and size = 'M';

  if v_after <> v_before - 3 then
    raise exception 'FAIL: stock went % -> %, expected a drop of 3', v_before, v_after;
  end if;
  raise notice 'stock committed: % -> %', v_before, v_after;

  -- Stripe redelivering the same event must change nothing.
  v_result := public.mark_order_paid_by_intent(p_payment_intent => 'pi_test_lifecycle');

  if not (v_result ->> 'alreadyPaid')::boolean then
    raise exception 'FAIL: a replayed payment was treated as new';
  end if;

  select stock into v_second from public.product_variants
   where product_id = 'the-pearl' and size = 'M';

  if v_second <> v_after then
    raise exception 'FAIL: a replayed webhook decremented stock again (% -> %)', v_after, v_second;
  end if;
  raise notice 'replay is a no-op: stock still %', v_second;

  -- A late failure event must not unpick a paid order.
  perform public.mark_intent_closed('pi_test_lifecycle', 'failed');
  if (select status from public.orders where stripe_payment_intent = 'pi_test_lifecycle') <> 'paid' then
    raise exception 'FAIL: a late failure event cancelled a paid order';
  end if;
  raise notice 'a late failure event left the paid order alone';

  -- And a paid order can no longer be re-priced.
  begin
    perform public.prepare_payment(v_token, 'uk-next-day');
    raise exception 'FAIL: a paid order was re-priced';
  exception
    when others then
      if sqlerrm like 'FAIL:%' then raise; end if;
      raise notice 'refused (re-pricing a paid order) -> %', sqlerrm;
  end;
end
$$;

\echo ''
\echo '--- 7. Overselling is survivable, not fatal ----------------------------'
do $$
declare
  v_token  uuid;
  v_result jsonb;
begin
  select (public.place_order(
    '[{"productId":"the-florence","size":"L","quantity":4}]'::jsonb, 'international'
  ) ->> 'clientToken')::uuid into v_token;

  perform public.prepare_payment(v_token, 'international');
  perform public.attach_payment_intent(v_token, 'pi_test_shortfall');

  -- The size sells out between checkout and payment.
  update public.product_variants set stock = 1
   where product_id = 'the-florence' and size = 'L';

  v_result := public.mark_order_paid_by_intent(
    p_payment_intent   => 'pi_test_shortfall',
    p_shipping_address => '{"line1":"1 Rue","city":"Paris","postal_code":"75001","country":"FR"}'::jsonb
  );

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
\echo '--- 8. A destination that does not match what was paid is flagged ------'
do $$
declare
  v_token  uuid;
  v_result jsonb;
begin
  -- Priced as UK, with its £0 delivery, but addressed to California.
  select (public.place_order(
    '[{"productId":"the-pearl","size":"XS","quantity":1}]'::jsonb, 'uk'
  ) ->> 'clientToken')::uuid into v_token;

  perform public.prepare_payment(v_token, 'uk-standard');
  perform public.attach_payment_intent(v_token, 'pi_test_zone');

  v_result := public.mark_order_paid_by_intent(
    p_payment_intent   => 'pi_test_zone',
    p_shipping_address => '{"line1":"1 Market St","city":"San Francisco","postal_code":"94103","country":"US"}'::jsonb
  );

  if not ((v_result -> 'order' ->> 'zone_mismatch')::boolean) then
    raise exception 'FAIL: a UK-priced order shipping to the US was not flagged';
  end if;
  if (v_result -> 'order' ->> 'status') <> 'paid' then
    raise exception 'FAIL: a mismatched order was refused rather than flagged';
  end if;

  raise notice 'paid and flagged — the studio decides, the payment stands';
end
$$;

\echo ''
\echo '--- 9. order_summary_by_intent leaks nothing internal -------------------'
select
  not (public.order_summary_by_intent('pi_test_lifecycle') ?| array[
    'stripe_payment_intent', 'stripe_customer_id', 'client_token',
    'stock_committed', 'zone_mismatch', 'id'
  ]) as summary_is_curated,
  public.order_summary_by_intent('pi_test_lifecycle') ->> 'reference' as reference,
  public.order_summary_by_intent('pi_test_lifecycle') ->> 'status'    as status;

select public.order_summary_by_intent('pi_nope') is null as unknown_intent_is_null;

\echo ''
\echo '--- 10. The Checkout Session era is gone -------------------------------'
select count(*) = 0 as session_functions_dropped
  from pg_proc
 where pronamespace = 'public'::regnamespace
   and proname in ('mark_order_paid', 'mark_order_closed', 'order_summary');

\echo ''
\echo '--- 11. RLS is on everywhere -------------------------------------------'
select relname, relrowsecurity as rls_enabled, relforcerowsecurity as forced
  from pg_class
 where relnamespace = 'public'::regnamespace
   and relname in ('products','product_variants','shipping_rates','orders','order_items','stripe_events')
 order by relname;

\echo ''
\echo '--- 12. anon and authenticated cannot call the money functions ---------'
select
  p.proname,
  has_function_privilege('anon',          p.oid, 'execute') as anon_can_call,
  has_function_privilege('authenticated', p.oid, 'execute') as authed_can_call,
  has_function_privilege('service_role',  p.oid, 'execute') as service_can_call
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in (
    'place_order','prepare_payment','attach_payment_intent',
    'mark_order_paid_by_intent','mark_intent_closed','order_summary_by_intent'
  )
order by p.proname;

rollback;

\echo ''
\echo 'Rolled back — the database is exactly as it was.'
