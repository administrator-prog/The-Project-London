-- ===========================================================================
-- Exercises the contacts table against the real schema, then rolls the whole
-- thing back. Like the other files here, nothing below is committed.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/contacts.sql
-- ===========================================================================

\set ON_ERROR_STOP on
begin;

\echo ''
\echo '--- 1. The popup creates a consenting contact ---------------------------'
do $$
declare
  c public.contacts%rowtype;
begin
  perform public.issue_welcome_code('Popup.Person@Example.com', 10, 30, 'popup wording');
  select * into c from public.contacts where email = 'popup.person@example.com';
  if not found or not c.marketing_consent or c.marketing_consent_text <> 'popup wording'
     or c.first_source <> 'welcome_popup' then
    raise exception 'FAIL: popup contact %', to_jsonb(c);
  end if;
  raise notice 'popup -> contact with consent';
end
$$;

\echo ''
\echo '--- 2. Checkout records the address at Pay, details at payment ---------'
do $$
declare
  v_token uuid;
  c public.contacts%rowtype;
begin
  v_token := (public.place_order('[{"productId":"the-pearl","size":"S","quantity":1}]'::jsonb, 'uk') ->> 'clientToken')::uuid;
  if exists (select 1 from public.contacts where first_source = 'checkout') then
    raise exception 'FAIL: contact made before an email was given';
  end if;

  perform public.prepare_payment(v_token, 'uk-standard', 'Buyer@Example.com');
  select * into c from public.contacts where email = 'buyer@example.com';
  if not found or c.marketing_consent then
    raise exception 'FAIL: checkout contact missing, or given consent it never gave: %', to_jsonb(c);
  end if;

  perform public.attach_payment_intent(v_token, 'pi_test_contacts_1');
  perform public.mark_order_paid_by_intent(
    p_payment_intent   => 'pi_test_contacts_1',
    p_customer_name    => 'Ada Buyer',
    p_phone            => '+447700900000',
    p_shipping_address => '{"name":"Ada Buyer","line1":"1 St","city":"London","country":"GB"}'::jsonb
  );
  select * into c from public.contacts where email = 'buyer@example.com';
  if c.name <> 'Ada Buyer' or c.phone <> '+447700900000' or c.country <> 'GB' then
    raise exception 'FAIL: payment details not recorded: %', to_jsonb(c);
  end if;
  raise notice 'checkout -> contact without consent, filled in on payment';
end
$$;

\echo ''
\echo '--- 3. Popup then purchase: one row, both sources, consent kept --------'
do $$
declare
  v_code  text := public.issue_welcome_code('both@example.com', 10, 30, 'popup wording') ->> 'code';
  v_token uuid;
  c public.contacts%rowtype;
begin
  v_token := (public.place_order('[{"productId":"the-florence","size":"M","quantity":1}]'::jsonb, 'uk') ->> 'clientToken')::uuid;
  perform public.apply_discount(v_token, v_code);
  perform public.prepare_payment(v_token, 'uk-standard', 'both@example.com');
  perform public.attach_payment_intent(v_token, 'pi_test_contacts_2');
  perform public.mark_order_paid_by_intent(p_payment_intent => 'pi_test_contacts_2', p_customer_name => 'Both Person');

  if (select count(*) from public.contacts where email = 'both@example.com') <> 1 then
    raise exception 'FAIL: duplicate contact';
  end if;
  select * into c from public.contacts where email = 'both@example.com';
  if c.sources <> array['welcome_popup', 'checkout'] or not c.marketing_consent or c.first_source <> 'welcome_popup' then
    raise exception 'FAIL: merged contact wrong: %', to_jsonb(c);
  end if;
  raise notice 'one row, sources %, consent kept', c.sources;
end
$$;

\echo ''
\echo '--- 4. The launch list, through record_contact -------------------------'
do $$
declare
  c public.contacts%rowtype;
begin
  perform public.record_contact('  Gate@Example.com ', 'launch_list', 'Gate Person', null, null, 'launch wording');
  perform public.record_contact('gate@example.com', 'launch_list', null);
  select * into c from public.contacts where email = 'gate@example.com';
  if c.name <> 'Gate Person' or not c.marketing_consent or c.sources <> array['launch_list'] then
    raise exception 'FAIL: launch list contact %', to_jsonb(c);
  end if;
  -- Junk is ignored, not an error.
  perform public.record_contact('not-an-email', 'launch_list');
  perform public.record_contact(null, 'launch_list');
  raise notice 'launch list recorded; a repeat with no name kept the name';
end
$$;

\echo ''
\echo '--- 5. Abandoned checkout shows up in the overview ----------------------'
do $$
declare
  v_token uuid;
  o record;
begin
  v_token := (public.place_order('[{"productId":"the-florence","size":"L","quantity":1}]'::jsonb, 'international') ->> 'clientToken')::uuid;
  perform public.prepare_payment(v_token, 'international', 'walked.away@example.com');
  update public.orders set created_at = now() - interval '2 hours' where client_token = v_token;

  select * into o from public.contacts_overview where email = 'walked.away@example.com';
  if o.segment <> 'abandoned_checkout' or o.abandoned_checkouts <> 1
     or o.last_abandoned_items <> array['The Florence Dress (L)'] or o.can_email then
    raise exception 'FAIL: abandoned overview %', to_jsonb(o);
  end if;
  raise notice 'abandoned: %, can_email %', o.last_abandoned_items, o.can_email;
end
$$;

\echo ''
\echo '--- 6. The overview, for the paid customers -----------------------------'
select email, segment, can_email, orders_paid, total_spent_pence, products_bought,
       welcome_code is not null as has_code, welcome_code_redeemed_at is not null as code_used
  from public.contacts_overview
 where email in ('buyer@example.com', 'both@example.com', 'popup.person@example.com', 'gate@example.com')
 order by email;

\echo ''
\echo '--- 7. A broken contacts table cannot stop a payment --------------------'
do $$
declare
  v_token uuid;
  v_result jsonb;
begin
  -- Make every contact write fail.
  alter table public.contacts add constraint contacts_test_break check (false) not valid;

  v_token := (public.place_order('[{"productId":"the-pearl","size":"M","quantity":1}]'::jsonb, 'uk') ->> 'clientToken')::uuid;
  perform public.prepare_payment(v_token, 'uk-standard', 'unlucky@example.com');
  perform public.attach_payment_intent(v_token, 'pi_test_contacts_3');
  v_result := public.mark_order_paid_by_intent(p_payment_intent => 'pi_test_contacts_3', p_customer_name => 'Unlucky');
  perform public.issue_welcome_code('unlucky.popup@example.com', 10, 30, 'x');

  if v_result -> 'order' ->> 'status' <> 'paid' then
    raise exception 'FAIL: payment did not complete';
  end if;
  if exists (select 1 from public.contacts where email like 'unlucky%') then
    raise exception 'FAIL: the break did not break anything, test is not testing';
  end if;

  alter table public.contacts drop constraint contacts_test_break;
  raise notice 'contact writes failing: order still paid, popup still issued a code';
end
$$;

\echo ''
\echo '--- 8. Locked down -------------------------------------------------------'
select c.relname, c.relrowsecurity as rls_on,
       has_table_privilege('anon', c.oid, 'select')          as anon_can_read,
       has_table_privilege('authenticated', c.oid, 'select') as authenticated_can_read
  from pg_class c
 where c.relname in ('contacts', 'contacts_overview')
 order by 1;

select has_function_privilege('anon', 'public.record_contact(text, text, text, text, text, text, timestamptz)', 'execute') as anon_can_write;

rollback;

\echo ''
\echo 'Rolled back — the database is exactly as it was.'
