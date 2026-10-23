-- ===========================================================================
-- Internal test codes: a near-free way to take a real payment end to end.
--
-- Stripe will not charge a card less than 30p, so a 100% code cannot test a
-- live payment. A code with source 'internal_test' may go up to 99% — the
-- Pearl at £325 then costs £3.25, which is refunded afterwards. Welcome codes
-- stay capped at 50%.
--
-- Test codes are made by hand in the SQL editor, never by the site, and are
-- not stored in this repository:
--
--   insert into public.discount_codes (code, email, percent_off, source, expires_at)
--   values ('TEST-' || upper(encode(gen_random_bytes(8), 'hex')),
--           'studio@theprojectlondon.com', 99, 'internal_test', now() + interval '24 hours')
--   returning code;
--
-- Single use like any other code. Delete it if it is not needed.
-- ===========================================================================

alter table public.discount_codes
  drop constraint if exists discount_codes_percent_off_check;

alter table public.discount_codes
  add constraint discount_codes_percent_off_check check (
    percent_off between 1 and 50
    or (source = 'internal_test' and percent_off between 1 and 99)
  );

-- Only the popup's codes are signups. A test code is not a contact.
create or replace function public.contacts_from_discount_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.source <> 'welcome' then
    return new;
  end if;

  begin
    perform public.record_contact(
      new.email, 'welcome_popup', null, null, null, new.marketing_consent, new.created_at
    );
  exception when others then
    raise warning 'contacts: could not record % from discount_codes: %', new.email, sqlerrm;
  end;
  return new;
end;
$$;

revoke all on function public.contacts_from_discount_code() from public, anon, authenticated;
grant execute on function public.contacts_from_discount_code() to service_role;
