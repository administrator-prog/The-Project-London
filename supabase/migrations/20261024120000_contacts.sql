-- ===========================================================================
-- Contacts: every email address the site has been given, in one place.
--
-- One row per address, whichever way it arrived:
--
--   welcome_popup  the 10% popup (discount_codes)
--   checkout       typed at checkout and sent with Pay — paid or not
--   launch_list    the "Notify me" form on the /access gate page
--
-- The row holds who they are, where they came from and whether they may be
-- sent marketing. What they bought is not copied here: contacts_overview
-- works it out from orders on every read, so it can never fall out of step.
-- Export that view to whichever CRM comes next.
--
-- Nothing here is allowed to fail a payment. Contacts are kept up to date by
-- triggers, and every trigger swallows its own errors — a broken contacts
-- table costs a contact row, never an order.
-- ===========================================================================

create table if not exists public.contacts (
  email                     text primary key check (email = lower(btrim(email)) and position('@' in email) > 1),
  name                      text,
  phone                     text,
  country                   text,

  -- How they first arrived, and every way they have arrived since.
  first_source              text not null,
  sources                   text[] not null default '{}',

  -- Marketing permission. Only the popup and the launch list grant it; a
  -- checkout email was given for a receipt, and is not consent to market.
  marketing_consent         boolean not null default false,
  marketing_consent_at      timestamptz,
  marketing_consent_source  text,
  marketing_consent_text    text,
  unsubscribed_at           timestamptz,

  first_seen_at             timestamptz not null default now(),
  last_seen_at              timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

comment on table public.contacts is
  'Every email address the site has collected, one row each. Order history '
  'is in the contacts_overview view. Kept current by triggers on orders and '
  'discount_codes, and by /api/subscribe.';

comment on column public.contacts.marketing_consent is
  'True only where the person agreed to marketing (popup, launch list). '
  'Check unsubscribed_at as well — or use contacts_overview.can_email.';

create index if not exists contacts_last_seen_idx on public.contacts (last_seen_at desc);

alter table public.contacts enable row level security;
alter table public.contacts force row level security;
revoke all on table public.contacts from anon, authenticated;

drop trigger if exists contacts_touch on public.contacts;
create trigger contacts_touch before update on public.contacts
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- record_contact — the one way a row is written
-- ---------------------------------------------------------------------------

/*
 * Adds an address or brings it up to date. Never overwrites a known value
 * with nothing, never takes consent away (unsubscribing is its own column),
 * and never moves first_seen_at.
 *
 * The timestamp is passed in so the backfill below can date rows from when
 * they really arrived rather than from the day this migration ran.
 */
create or replace function public.record_contact(
  p_email         text,
  p_source        text,
  p_name          text default null,
  p_phone         text default null,
  p_country       text default null,
  p_consent_text  text default null,
  p_seen_at       timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_at    timestamptz := coalesce(p_seen_at, now());
  v_name  text := nullif(btrim(coalesce(p_name, '')), '');
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  v_ctry  text := nullif(upper(btrim(coalesce(p_country, ''))), '');
  v_cons  boolean := p_consent_text is not null;
begin
  if position('@' in v_email) <= 1 then
    return;
  end if;

  insert into public.contacts as c (
    email, name, phone, country, first_source, sources,
    marketing_consent, marketing_consent_at, marketing_consent_source, marketing_consent_text,
    first_seen_at, last_seen_at
  )
  values (
    v_email, v_name, v_phone, v_ctry, p_source, array[p_source],
    v_cons,
    case when v_cons then v_at end,
    case when v_cons then p_source end,
    p_consent_text,
    v_at, v_at
  )
  on conflict (email) do update
     set name    = coalesce(excluded.name, c.name),
         phone   = coalesce(excluded.phone, c.phone),
         country = coalesce(excluded.country, c.country),
         sources = case when p_source = any (c.sources) then c.sources
                        else c.sources || p_source end,
         first_seen_at = least(c.first_seen_at, excluded.first_seen_at),
         last_seen_at  = greatest(c.last_seen_at, excluded.last_seen_at),
         -- The first consent given is the one kept on record.
         marketing_consent        = c.marketing_consent or excluded.marketing_consent,
         marketing_consent_at     = coalesce(c.marketing_consent_at, excluded.marketing_consent_at),
         marketing_consent_source = coalesce(c.marketing_consent_source, excluded.marketing_consent_source),
         marketing_consent_text   = coalesce(c.marketing_consent_text, excluded.marketing_consent_text);
end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers — the popup and checkout feed it without being changed
-- ---------------------------------------------------------------------------

create or replace function public.contacts_from_discount_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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

drop trigger if exists discount_codes_contact on public.discount_codes;
create trigger discount_codes_contact after insert on public.discount_codes
  for each row execute function public.contacts_from_discount_code();

/*
 * An order gets its email when the customer presses Pay (prepare_payment),
 * and its name, phone and address when the payment lands. Both moments pass
 * through here. An order nobody ever pressed Pay on has no email, and so no
 * contact.
 */
create or replace function public.contacts_from_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and new.email is not distinct from old.email
     and new.status = old.status
     and new.customer_name is not distinct from old.customer_name
     and new.shipping_address is not distinct from old.shipping_address then
    return new;
  end if;

  begin
    perform public.record_contact(
      new.email,
      'checkout',
      new.customer_name,
      new.phone,
      coalesce(new.shipping_address ->> 'country', new.billing_address ->> 'country'),
      null,
      now()
    );
  exception when others then
    raise warning 'contacts: could not record % from order %: %', new.email, new.reference, sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists orders_contact on public.orders;
create trigger orders_contact after insert or update on public.orders
  for each row execute function public.contacts_from_order();

-- ---------------------------------------------------------------------------
-- contacts_overview — the export
-- ---------------------------------------------------------------------------

/*
 * One row per contact with everything a CRM wants on import. Order figures
 * are computed from orders here, never stored.
 *
 *   segment          customer, abandoned_checkout or subscriber
 *   can_email        consented and not unsubscribed — the newsletter list
 *   abandoned_*      pressed Pay and never paid, with no paid order since
 *
 * A pending order counts as abandoned once it is an hour old, so somebody
 * still on the 3-D Secure screen is not on the list.
 */
create or replace view public.contacts_overview
with (security_invoker = true)
as
with paid as (
  select lower(o.email) as email,
         count(*)                              as orders_paid,
         sum(coalesce(o.total_pence, 0))       as total_spent_pence,
         min(o.paid_at)                        as first_order_at,
         max(o.paid_at)                        as last_order_at,
         (array_agg(o.reference order by o.paid_at desc))[1] as last_order_reference
    from public.orders o
   where o.status in ('paid', 'fulfilled') and o.email is not null
   group by 1
),
bought as (
  select lower(o.email) as email,
         array_agg(distinct i.product_name order by i.product_name) as products_bought,
         array_agg(distinct i.size order by i.size)                as sizes_bought
    from public.orders o
    join public.order_items i on i.order_id = o.id
   where o.status in ('paid', 'fulfilled') and o.email is not null
   group by 1
),
abandoned as (
  select lower(o.email) as email,
         count(*)        as abandoned_checkouts,
         max(o.created_at) as last_abandoned_at,
         (array_agg(o.reference order by o.created_at desc))[1] as last_abandoned_reference,
         (array_agg(o.subtotal_pence order by o.created_at desc))[1] as last_abandoned_value_pence
    from public.orders o
   where o.email is not null
     and (o.status in ('failed', 'cancelled')
          or (o.status = 'pending' and o.created_at < now() - interval '1 hour'))
   group by 1
),
abandoned_items as (
  select distinct on (lower(o.email))
         lower(o.email) as email,
         (select array_agg(i.product_name || ' (' || i.size || ')' order by i.product_name)
            from public.order_items i where i.order_id = o.id) as last_abandoned_items
    from public.orders o
   where o.email is not null
     and (o.status in ('failed', 'cancelled')
          or (o.status = 'pending' and o.created_at < now() - interval '1 hour'))
   order by lower(o.email), o.created_at desc
)
select c.email,
       c.name,
       split_part(coalesce(c.name, ''), ' ', 1)                         as first_name,
       c.phone,
       c.country,
       case
         when coalesce(p.orders_paid, 0) > 0 then 'customer'
         when coalesce(a.abandoned_checkouts, 0) > 0 then 'abandoned_checkout'
         else 'subscriber'
       end                                                              as segment,
       c.marketing_consent and c.unsubscribed_at is null                as can_email,
       c.marketing_consent,
       c.marketing_consent_at,
       c.marketing_consent_source,
       c.marketing_consent_text,
       c.unsubscribed_at,
       c.first_source,
       c.sources,
       c.first_seen_at,
       c.last_seen_at,
       coalesce(p.orders_paid, 0)                                       as orders_paid,
       coalesce(p.total_spent_pence, 0)                                 as total_spent_pence,
       p.first_order_at,
       p.last_order_at,
       p.last_order_reference,
       b.products_bought,
       b.sizes_bought,
       -- Abandoned checkouts from before their latest purchase are history,
       -- not a basket to chase.
       case when p.last_order_at is null or a.last_abandoned_at > p.last_order_at
            then coalesce(a.abandoned_checkouts, 0) else 0 end           as abandoned_checkouts,
       case when p.last_order_at is null or a.last_abandoned_at > p.last_order_at
            then a.last_abandoned_at end                                 as last_abandoned_at,
       case when p.last_order_at is null or a.last_abandoned_at > p.last_order_at
            then a.last_abandoned_reference end                          as last_abandoned_reference,
       case when p.last_order_at is null or a.last_abandoned_at > p.last_order_at
            then a.last_abandoned_value_pence end                        as last_abandoned_value_pence,
       case when p.last_order_at is null or a.last_abandoned_at > p.last_order_at
            then ai.last_abandoned_items end                             as last_abandoned_items,
       d.code                                                           as welcome_code,
       d.created_at                                                     as welcome_code_sent_at,
       d.expires_at                                                     as welcome_code_expires_at,
       d.redeemed_at                                                    as welcome_code_redeemed_at
  from public.contacts c
  left join paid p            on p.email = c.email
  left join bought b          on b.email = c.email
  left join abandoned a       on a.email = c.email
  left join abandoned_items ai on ai.email = c.email
  left join public.discount_codes d on d.email = c.email and d.source = 'welcome';

comment on view public.contacts_overview is
  'Contacts with their order history, segment and welcome code, worked out '
  'live from orders. The thing to export to a CRM. can_email = the '
  'newsletter list.';

-- Supabase grants new views to anon and authenticated by default. This one
-- is names, phones and spending — service role only, like everything else.
revoke all on public.contacts_overview from anon, authenticated, public;
grant select on public.contacts_overview to service_role;

-- ---------------------------------------------------------------------------
-- Lockdown
-- ---------------------------------------------------------------------------

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.record_contact(text, text, text, text, text, text, timestamptz)',
    'public.contacts_from_discount_code()',
    'public.contacts_from_order()'
  ]
  loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Backfill — everyone collected so far
-- ---------------------------------------------------------------------------

-- Oldest first, so first_source is where each address really came from.
do $$
declare
  r record;
begin
  for r in
    select email, 'welcome_popup' as source, null::text as name, null::text as phone,
           null::text as country, marketing_consent as consent, created_at as at
      from public.discount_codes
    union all
    select email, 'checkout', customer_name, phone,
           coalesce(shipping_address ->> 'country', billing_address ->> 'country'),
           null, coalesce(paid_at, created_at)
      from public.orders
     where email is not null
    order by at
  loop
    perform public.record_contact(r.email, r.source, r.name, r.phone, r.country, r.consent, r.at);
  end loop;
end
$$;
