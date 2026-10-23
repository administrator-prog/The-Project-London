-- ===========================================================================
-- Exercises the welcome discount against the real schema, then rolls the
-- whole thing back. Like order-lifecycle.sql, nothing below is committed.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/welcome-discount.sql
-- ===========================================================================

\set ON_ERROR_STOP on
begin;

\echo ''
\echo '--- 1. One code per address -------------------------------------------'
do $$
declare
  v_first  jsonb;
  v_again  jsonb;
  v_upper  jsonb;
begin
  v_first := public.issue_welcome_code('New.Visitor@Example.com', 10, 30, 'consent wording');
  if v_first ->> 'status' <> 'new' or v_first ->> 'code' !~ '^WELCOME-[A-HJ-NP-Z2-9]{6}$' then
    raise exception 'FAIL: first request did not issue a code: %', v_first;
  end if;

  v_again := public.issue_welcome_code('new.visitor@example.com', 10, 30);
  v_upper := public.issue_welcome_code('  NEW.VISITOR@EXAMPLE.COM ', 10, 30);
  if v_again ->> 'status' <> 'existing'
     or v_again ->> 'code' <> v_first ->> 'code'
     or v_upper ->> 'code' <> v_first ->> 'code' then
    raise exception 'FAIL: a second request made a second code: % / %', v_again, v_upper;
  end if;

  if (select count(*) from public.discount_codes where email = 'new.visitor@example.com') <> 1 then
    raise exception 'FAIL: more than one row for the address';
  end if;

  if (select marketing_consent from public.discount_codes where code = v_first ->> 'code')
     <> 'consent wording' then
    raise exception 'FAIL: consent wording not recorded';
  end if;

  begin
    perform public.issue_welcome_code('not-an-email', 10, 30);
    raise exception 'FAIL: accepted an address with no @';
  exception when others then
    if sqlerrm <> 'invalid_email' then raise; end if;
  end;

  raise notice 'issued %, and the same code again on request', v_first ->> 'code';
end
$$;

\echo ''
\echo '--- 2. The discount comes off the subtotal, not the delivery -----------'
do $$
declare
  v_code    text := public.issue_welcome_code('buyer.one@example.com', 10, 30) ->> 'code';
  v_token   uuid;
  v_applied jsonb;
  v_priced  jsonb;
begin
  -- One Florence (35000) to an international address (2500 delivery).
  v_token := (public.place_order(
    '[{"productId":"the-florence","size":"M","quantity":1}]'::jsonb, 'international'
  ) ->> 'clientToken')::uuid;

  -- Typed in lower case with spaces, as people do.
  v_applied := public.apply_discount(v_token, '  ' || lower(v_code) || ' ');
  if (v_applied ->> 'discountPence')::int <> 3500 or v_applied ->> 'code' <> v_code then
    raise exception 'FAIL: apply_discount returned %', v_applied;
  end if;

  v_priced := public.prepare_payment(v_token, 'international');
  if (v_priced ->> 'totalPence')::int <> 35000 - 3500 + 2500 then
    raise exception 'FAIL: total should be 34000, got %', v_priced ->> 'totalPence';
  end if;
  if (v_priced ->> 'discountPence')::int <> 3500 then
    raise exception 'FAIL: prepare_payment discount %', v_priced ->> 'discountPence';
  end if;

  -- What is stored is what will be charged.
  if (select total_pence from public.orders where client_token = v_token) <> 34000 then
    raise exception 'FAIL: stored total does not match the quoted one';
  end if;

  raise notice 'Florence + international with code -> total % (35000 - 3500 + 2500)',
    v_priced ->> 'totalPence';
end
$$;

\echo ''
\echo '--- 3. Without a code nothing changes ---------------------------------'
do $$
declare
  v_token  uuid;
  v_priced jsonb;
begin
  v_token := (public.place_order(
    '[{"productId":"the-pearl","size":"S","quantity":2}]'::jsonb, 'uk'
  ) ->> 'clientToken')::uuid;

  v_priced := public.prepare_payment(v_token, 'uk-next-day');
  if (v_priced ->> 'totalPence')::int <> 65000 + 795
     or (v_priced ->> 'discountPence')::int <> 0 then
    raise exception 'FAIL: full-price order changed: %', v_priced;
  end if;
  raise notice 'two Pearls, next day, no code -> total %', v_priced ->> 'totalPence';
end
$$;

\echo ''
\echo '--- 4. A code can be removed again --------------------------------------'
do $$
declare
  v_code   text := public.issue_welcome_code('changes.mind@example.com', 10, 30) ->> 'code';
  v_token  uuid;
  v_priced jsonb;
begin
  v_token := (public.place_order(
    '[{"productId":"the-pearl","size":"M","quantity":1}]'::jsonb, 'uk'
  ) ->> 'clientToken')::uuid;

  perform public.apply_discount(v_token, v_code);
  perform public.apply_discount(v_token, '');
  v_priced := public.prepare_payment(v_token, 'uk-standard');

  if (v_priced ->> 'totalPence')::int <> 32500 then
    raise exception 'FAIL: removed code still discounted: %', v_priced;
  end if;
  if (select discount_code from public.orders where client_token = v_token) is not null then
    raise exception 'FAIL: removed code still on the order';
  end if;
  raise notice 'applied then removed -> total %', v_priced ->> 'totalPence';
end
$$;

\echo ''
\echo '--- 5. Spent once the payment lands, and only then --------------------'
do $$
declare
  v_code    text := public.issue_welcome_code('buyer.two@example.com', 10, 30) ->> 'code';
  v_token   uuid;
  v_order   uuid;
  v_other   uuid;
  v_result  jsonb;
begin
  v_token := (public.place_order(
    '[{"productId":"the-pearl","size":"L","quantity":1}]'::jsonb, 'uk'
  ) ->> 'clientToken')::uuid;
  select id into v_order from public.orders where client_token = v_token;

  perform public.apply_discount(v_token, v_code);
  perform public.prepare_payment(v_token, 'uk-standard', 'buyer.two@example.com');

  -- Applied and priced, but not paid: still unspent.
  if (select redeemed_at from public.discount_codes where code = v_code) is not null then
    raise exception 'FAIL: code spent before payment';
  end if;

  perform public.attach_payment_intent(v_token, 'pi_test_discount_1');
  v_result := public.mark_order_paid_by_intent(
    p_payment_intent => 'pi_test_discount_1',
    p_total_pence    => 29250
  );

  if (select redeemed_order_id from public.discount_codes where code = v_code) <> v_order then
    raise exception 'FAIL: code not spent against the paid order';
  end if;
  if (v_result -> 'order' ->> 'discount_pence')::int <> 3250
     or (v_result -> 'order' ->> 'total_pence')::int <> 29250 then
    raise exception 'FAIL: paid order totals wrong: %', v_result -> 'order';
  end if;

  -- A replayed webhook leaves it where it is.
  perform public.mark_order_paid_by_intent(p_payment_intent => 'pi_test_discount_1');
  if (select redeemed_order_id from public.discount_codes where code = v_code) <> v_order then
    raise exception 'FAIL: replay moved the code';
  end if;

  -- And a second order cannot use it.
  v_token := (public.place_order(
    '[{"productId":"the-pearl","size":"L","quantity":1}]'::jsonb, 'uk'
  ) ->> 'clientToken')::uuid;
  begin
    perform public.apply_discount(v_token, v_code);
    raise exception 'FAIL: a spent code was accepted';
  exception when others then
    if sqlerrm <> 'discount_used' then raise; end if;
  end;

  -- Nor does asking the popup again produce a fresh one.
  if public.issue_welcome_code('buyer.two@example.com', 10, 30) ->> 'status' <> 'used'
     or public.issue_welcome_code('buyer.two@example.com', 10, 30) ? 'code' then
    raise exception 'FAIL: a spent address was given a code';
  end if;

  raise notice 'spent on payment, refused on a second order, no second code issued';
end
$$;

\echo ''
\echo '--- 6. Spent between applying and paying ------------------------------'
-- Two tabs, one code. The first pays; the second must not be charged at the
-- discounted price, and must not be silently charged full price either.
do $$
declare
  v_code   text := public.issue_welcome_code('two.tabs@example.com', 10, 30) ->> 'code';
  v_a      uuid;
  v_b      uuid;
begin
  v_a := (public.place_order('[{"productId":"the-pearl","size":"S","quantity":1}]'::jsonb, 'uk') ->> 'clientToken')::uuid;
  v_b := (public.place_order('[{"productId":"the-pearl","size":"S","quantity":1}]'::jsonb, 'uk') ->> 'clientToken')::uuid;

  perform public.apply_discount(v_a, v_code);
  perform public.apply_discount(v_b, v_code);

  perform public.prepare_payment(v_a, 'uk-standard');
  perform public.attach_payment_intent(v_a, 'pi_test_two_tabs');
  perform public.mark_order_paid_by_intent(p_payment_intent => 'pi_test_two_tabs');

  begin
    perform public.prepare_payment(v_b, 'uk-standard');
    raise exception 'FAIL: second tab priced with a spent code';
  exception when others then
    if sqlerrm <> 'discount_invalid' then raise; end if;
  end;

  -- Taking the code off lets the second tab pay at full price.
  perform public.apply_discount(v_b, '');
  if (public.prepare_payment(v_b, 'uk-standard') ->> 'totalPence')::int <> 32500 then
    raise exception 'FAIL: second tab could not continue without the code';
  end if;

  raise notice 'second tab refused with discount_invalid, pays full price once removed';
end
$$;

\echo ''
\echo '--- 7. Unknown and expired codes are refused ---------------------------'
do $$
declare
  v_code  text := public.issue_welcome_code('late@example.com', 10, 30) ->> 'code';
  v_token uuid;
begin
  v_token := (public.place_order('[{"productId":"the-pearl","size":"S","quantity":1}]'::jsonb, 'uk') ->> 'clientToken')::uuid;

  begin
    perform public.apply_discount(v_token, 'WELCOME-NOTREAL');
    raise exception 'FAIL: unknown code accepted';
  exception when others then
    if sqlerrm <> 'discount_unknown' then raise; end if;
  end;

  update public.discount_codes set expires_at = now() - interval '1 minute' where code = v_code;
  begin
    perform public.apply_discount(v_token, v_code);
    raise exception 'FAIL: expired code accepted';
  exception when others then
    if sqlerrm <> 'discount_expired' then raise; end if;
  end;

  -- Lapsed after being applied: caught when the amount is fixed.
  update public.discount_codes set expires_at = now() + interval '1 day' where code = v_code;
  perform public.apply_discount(v_token, v_code);
  update public.discount_codes set expires_at = now() - interval '1 minute' where code = v_code;
  begin
    perform public.prepare_payment(v_token, 'uk-standard');
    raise exception 'FAIL: lapsed code priced';
  exception when others then
    if sqlerrm <> 'discount_invalid' then raise; end if;
  end;

  -- Asking the popup again renews an unspent, lapsed code. Two statements:
  -- a subquery in the same one would read the row from before the renewal.
  if public.issue_welcome_code('late@example.com', 10, 30) ->> 'code' <> v_code then
    raise exception 'FAIL: re-request issued a different code';
  end if;
  if (select expires_at from public.discount_codes where code = v_code) < now() + interval '29 days' then
    raise exception 'FAIL: lapsed code was not renewed';
  end if;

  raise notice 'unknown, expired and lapsed-after-apply all refused; re-request renews';
end
$$;

\echo ''
\echo '--- 8. A paid order cannot be re-discounted ----------------------------'
do $$
declare
  v_code  text := public.issue_welcome_code('after@example.com', 10, 30) ->> 'code';
  v_token uuid;
begin
  v_token := (public.place_order('[{"productId":"the-pearl","size":"S","quantity":1}]'::jsonb, 'uk') ->> 'clientToken')::uuid;
  perform public.prepare_payment(v_token, 'uk-standard');
  perform public.attach_payment_intent(v_token, 'pi_test_after');
  perform public.mark_order_paid_by_intent(p_payment_intent => 'pi_test_after');

  begin
    perform public.apply_discount(v_token, v_code);
    raise exception 'FAIL: discounted a paid order';
  exception when others then
    if sqlerrm not like 'order_closed:%' then raise; end if;
  end;
  raise notice 'paid order refused with %', 'order_closed';
end
$$;

\echo ''
\echo '--- 9. The confirmation page sees the discount -------------------------'
select (s ->> 'discountPence')::int = 3250 as discount_shown,
       (s ->> 'totalPence')::int    = 29250 as total_shown,
       s ->> 'discountCode' like 'WELCOME-%' as code_shown
  from (select public.order_summary_by_intent('pi_test_discount_1') as s) t;

\echo ''
\echo '--- 10. Locked down like everything else -------------------------------'
select c.relname, c.relrowsecurity as rls_on, c.relforcerowsecurity as rls_forced
  from pg_class c where c.relname = 'discount_codes';

select p.proname,
       has_function_privilege('anon', p.oid, 'execute')          as anon_can_call,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_can_call
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('issue_welcome_code', 'apply_discount', 'prepare_payment',
                     'mark_order_paid_by_intent', 'order_summary_by_intent', 'admin_order_list')
 order by p.proname;

rollback;

\echo ''
\echo 'Rolled back — the database is exactly as it was.'
