-- ===========================================================================
-- Commerce: catalogue, stock, orders, Stripe bookkeeping.
--
-- The guiding rule: the browser is never trusted with money. It sends product
-- ids, sizes and quantities; every price, line total and stock check is read
-- back out of these tables by place_order(). A tampered bag can only ever buy
-- the real catalogue at the real price.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------

create table if not exists public.products (
  id           text primary key,
  name         text not null,
  price_pence  integer not null check (price_pence > 0),
  currency     text not null default 'gbp',
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.products is
  'Price source of truth. Money is held in minor units (pence) throughout — '
  'floats have no business anywhere near a total.';

create table if not exists public.product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  text not null references public.products(id) on delete cascade,
  size        text not null,
  stock       integer not null default 0 check (stock >= 0),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (product_id, size)
);

comment on column public.product_variants.stock is
  'Units on hand. The non-negative check is the last line of defence against '
  'overselling; commit_order_stock() catches it before the constraint fires.';

create table if not exists public.shipping_rates (
  id                 text primary key,
  zone               text not null check (zone in ('uk', 'international')),
  label              text not null,
  description        text,
  price_pence        integer not null check (price_pence >= 0),
  delivery_min_days  integer,
  delivery_max_days  integer,
  active             boolean not null default true,
  sort_order         integer not null default 0
);

comment on table public.shipping_rates is
  'Rates offered on the Stripe Checkout page. Stripe shows every option a '
  'session carries, so the session is built with one zone''s rates only.';

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------

do $$
begin
  create type public.order_status as enum (
    'pending', 'paid', 'fulfilled', 'cancelled', 'refunded', 'failed'
  );
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.orders (
  id         uuid primary key default gen_random_uuid(),
  reference  text not null unique,
  status     public.order_status not null default 'pending',
  currency   text not null default 'gbp',

  email          text,
  customer_name  text,
  phone          text,

  shipping_zone     text not null check (shipping_zone in ('uk', 'international')),
  shipping_method   text,
  shipping_address  jsonb,
  billing_address   jsonb,

  -- Ours, computed at creation from the catalogue.
  subtotal_pence  integer not null check (subtotal_pence >= 0),
  -- Stripe's, unknown until the customer picks a rate on the hosted page.
  shipping_pence  integer,
  discount_pence  integer not null default 0,
  total_pence     integer,

  stripe_session_id      text unique,
  stripe_payment_intent  text,
  stripe_customer_id     text,

  -- Bookkeeping that keeps the webhook safe to replay.
  stock_committed         boolean not null default false,
  stock_shortfall         boolean not null default false,
  customer_email_sent_at  timestamptz,
  studio_email_sent_at    timestamptz,

  notes         text,
  paid_at       timestamptz,
  cancelled_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on column public.orders.stock_shortfall is
  'Set when a paid order could not be fully decremented. The payment is never '
  'failed over stock — the money is already taken — so this flags it for the '
  'studio to resolve by hand.';

create table if not exists public.order_items (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references public.orders(id) on delete cascade,
  product_id        text not null,
  -- Snapshots. A later price change or rename must not rewrite history.
  product_name      text not null,
  size              text not null,
  quantity          integer not null check (quantity > 0),
  unit_price_pence  integer not null check (unit_price_pence >= 0),
  created_at        timestamptz not null default now()
);

create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_email_idx on public.orders (lower(email));

-- Every webhook Stripe has already delivered. Stripe retries on any non-2xx
-- and can deliver the same event twice on its own, so the primary key here is
-- what stops a customer being charged one order and emailed three receipts.
create table if not exists public.stripe_events (
  id           text primary key,
  type         text not null,
  order_id     uuid references public.orders(id) on delete set null,
  received_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Housekeeping
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

drop trigger if exists product_variants_touch on public.product_variants;
create trigger product_variants_touch before update on public.product_variants
  for each row execute function public.touch_updated_at();

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

/*
 * A reference a customer can read down the phone: TPL-4F2K9Q.
 *
 * The alphabet drops I, O, 0 and 1 — the characters people mis-hear and
 * mistype. 32^6 is ample for a two-piece collection, and the loop covers the
 * collision anyway rather than trusting the odds.
 */
create or replace function public.generate_order_reference()
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  attempt   integer := 0;
begin
  loop
    candidate := 'TPL-';
    for i in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;

    exit when not exists (select 1 from public.orders o where o.reference = candidate);

    attempt := attempt + 1;
    if attempt > 20 then
      raise exception 'could not allocate a unique order reference';
    end if;
  end loop;

  return candidate;
end;
$$;

-- ---------------------------------------------------------------------------
-- place_order — the only way an order is created
-- ---------------------------------------------------------------------------

/*
 * Takes the bag as [{ "productId": ..., "size": ..., "quantity": ... }] and
 * returns the order with its priced lines, ready to become Stripe line items.
 *
 * Everything monetary is looked up here. The caller's numbers, if it sent any,
 * are ignored.
 *
 * Stock is checked but *not* reserved. Reserving would need an expiry and a
 * reaper to release bags that were abandoned on Stripe's page, which is a lot
 * of machinery for a collection with fifty units a size. The real decrement
 * happens in commit_order_stock() once the money has actually arrived.
 */
create or replace function public.place_order(
  p_lines          jsonb,
  p_shipping_zone  text,
  p_email          text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  max_per_line constant integer := 9;
  v_order      public.orders%rowtype;
  v_line       jsonb;
  v_product    public.products%rowtype;
  v_variant    public.product_variants%rowtype;
  v_product_id text;
  v_size       text;
  v_quantity   integer;
  v_subtotal   integer := 0;
  v_seen       text[] := '{}';
  v_items      jsonb := '[]'::jsonb;
begin
  if p_shipping_zone is null or p_shipping_zone not in ('uk', 'international') then
    raise exception 'invalid_shipping_zone';
  end if;

  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'empty_bag';
  end if;

  if jsonb_array_length(p_lines) > 20 then
    raise exception 'too_many_lines';
  end if;

  -- The order row is created up front so lines have something to hang off;
  -- its subtotal is corrected once every line has been priced below.
  insert into public.orders (reference, shipping_zone, email, subtotal_pence, currency)
  values (
    public.generate_order_reference(),
    p_shipping_zone,
    nullif(lower(trim(coalesce(p_email, ''))), ''),
    0,
    'gbp'
  )
  returning * into v_order;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_product_id := v_line ->> 'productId';
    v_size       := v_line ->> 'size';

    begin
      v_quantity := (v_line ->> 'quantity')::integer;
    exception
      when others then raise exception 'invalid_quantity';
    end;

    if v_product_id is null or v_size is null then
      raise exception 'invalid_line';
    end if;

    if v_quantity is null or v_quantity < 1 or v_quantity > max_per_line then
      raise exception 'invalid_quantity';
    end if;

    -- The same piece in the same size must arrive as one line, not several,
    -- or the per-line ceiling above is trivially sidestepped.
    if (v_product_id || '::' || v_size) = any (v_seen) then
      raise exception 'duplicate_line';
    end if;
    v_seen := v_seen || (v_product_id || '::' || v_size);

    select * into v_product
      from public.products
     where id = v_product_id and active;

    if not found then
      raise exception 'unknown_product:%', v_product_id;
    end if;

    select * into v_variant
      from public.product_variants
     where product_id = v_product_id and size = v_size;

    if not found then
      raise exception 'unknown_size:%', v_size;
    end if;

    if v_variant.stock < v_quantity then
      raise exception 'insufficient_stock:%:%:%', v_product_id, v_size, v_variant.stock;
    end if;

    v_subtotal := v_subtotal + (v_product.price_pence * v_quantity);

    insert into public.order_items
      (order_id, product_id, product_name, size, quantity, unit_price_pence)
    values
      (v_order.id, v_product.id, v_product.name, v_size, v_quantity, v_product.price_pence);
  end loop;

  update public.orders
     set subtotal_pence = v_subtotal
   where id = v_order.id
  returning * into v_order;

  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'productId',      i.product_id,
               'productName',    i.product_name,
               'size',           i.size,
               'quantity',       i.quantity,
               'unitPricePence', i.unit_price_pence
             )
             order by i.product_id, i.size
           ),
           '[]'::jsonb
         )
    into v_items
    from public.order_items i
   where i.order_id = v_order.id;

  return jsonb_build_object(
    'id',             v_order.id,
    'reference',      v_order.reference,
    'currency',       v_order.currency,
    'subtotalPence',  v_order.subtotal_pence,
    'shippingZone',   v_order.shipping_zone,
    'items',          v_items
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- mark_order_paid — the webhook's single write
-- ---------------------------------------------------------------------------

/*
 * Records the money, commits the stock, and reports whether this was the first
 * time. Safe to call repeatedly: Stripe retries on any non-2xx and will happily
 * deliver the same event twice unprompted, so this has to be a no-op the second
 * time round rather than a second decrement.
 *
 * Stock never fails the order. By the time this runs the customer has paid; a
 * shortfall is the studio's problem to sort out, not a reason to bounce a
 * completed payment. It is recorded on the order and flagged in the email.
 */
create or replace function public.mark_order_paid(
  p_session_id        text,
  p_payment_intent    text default null,
  p_customer_id       text default null,
  p_email             text default null,
  p_customer_name     text default null,
  p_phone             text default null,
  p_shipping_method   text default null,
  p_shipping_pence    integer default null,
  p_total_pence       integer default null,
  p_shipping_address  jsonb default null,
  p_billing_address   jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order      public.orders%rowtype;
  v_item       public.order_items%rowtype;
  v_already    boolean;
  v_shortfall  boolean := false;
  v_items      jsonb;
begin
  -- FOR UPDATE serialises two concurrent deliveries of the same event.
  select * into v_order
    from public.orders
   where stripe_session_id = p_session_id
     for update;

  if not found then
    raise exception 'unknown_session:%', p_session_id;
  end if;

  v_already := v_order.status in ('paid', 'fulfilled');

  if not v_already then
    update public.orders
       set status                = 'paid',
           paid_at               = now(),
           stripe_payment_intent = coalesce(p_payment_intent, stripe_payment_intent),
           stripe_customer_id    = coalesce(p_customer_id, stripe_customer_id),
           email                 = coalesce(nullif(lower(trim(coalesce(p_email, ''))), ''), email),
           customer_name         = coalesce(p_customer_name, customer_name),
           phone                 = coalesce(p_phone, phone),
           shipping_method       = coalesce(p_shipping_method, shipping_method),
           shipping_pence        = coalesce(p_shipping_pence, shipping_pence),
           total_pence           = coalesce(p_total_pence, total_pence),
           shipping_address      = coalesce(p_shipping_address, shipping_address),
           billing_address       = coalesce(p_billing_address, billing_address)
     where id = v_order.id
    returning * into v_order;
  end if;

  if not v_order.stock_committed then
    for v_item in
      select * from public.order_items where order_id = v_order.id
    loop
      update public.product_variants
         set stock = stock - v_item.quantity
       where product_id = v_item.product_id
         and size = v_item.size
         and stock >= v_item.quantity;

      if not found then
        -- Sold out from under this order between checkout and payment. Take
        -- whatever is left rather than leaving a phantom unit on the shelf.
        v_shortfall := true;
        update public.product_variants
           set stock = 0
         where product_id = v_item.product_id
           and size = v_item.size
           and stock > 0;
      end if;
    end loop;

    update public.orders
       set stock_committed = true,
           stock_shortfall = v_shortfall
     where id = v_order.id
    returning * into v_order;
  end if;

  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'productId',      i.product_id,
               'productName',    i.product_name,
               'size',           i.size,
               'quantity',       i.quantity,
               'unitPricePence', i.unit_price_pence
             )
             order by i.product_id, i.size
           ),
           '[]'::jsonb
         )
    into v_items
    from public.order_items i
   where i.order_id = v_order.id;

  return jsonb_build_object(
    'alreadyPaid',    v_already,
    'order',          to_jsonb(v_order),
    'items',          v_items
  );
end;
$$;

/*
 * A session that expired or a payment that failed. Only ever moves an order
 * that is still pending — a late failure event must not undo a paid order.
 */
create or replace function public.mark_order_closed(
  p_session_id text,
  p_status     public.order_status
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('cancelled', 'failed') then
    raise exception 'invalid_status';
  end if;

  update public.orders
     set status = p_status,
         cancelled_at = now()
   where stripe_session_id = p_session_id
     and status = 'pending';
end;
$$;

/*
 * What the confirmation page is allowed to see. Deliberately not the whole
 * row: no payment intent, no customer id, no internal flags.
 */
create or replace function public.order_summary(p_session_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where stripe_session_id = p_session_id;
  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'reference',      v_order.reference,
    'status',         v_order.status,
    'email',          v_order.email,
    'customerName',   v_order.customer_name,
    'currency',       v_order.currency,
    'subtotalPence',  v_order.subtotal_pence,
    'shippingPence',  v_order.shipping_pence,
    'totalPence',     v_order.total_pence,
    'shippingMethod', v_order.shipping_method,
    'placedAt',       v_order.created_at,
    'items', (
      select coalesce(
               jsonb_agg(
                 jsonb_build_object(
                   'productId',      i.product_id,
                   'productName',    i.product_name,
                   'size',           i.size,
                   'quantity',       i.quantity,
                   'unitPricePence', i.unit_price_pence
                 )
                 order by i.product_id, i.size
               ),
               '[]'::jsonb
             )
        from public.order_items i
       where i.order_id = v_order.id
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Lockdown
--
-- RLS on with no policies means the anon and authenticated keys can read
-- nothing and write nothing — not a product, and certainly not an order. Every
-- table here is reached only by the service-role key, which lives in Vercel's
-- environment and never touches the browser bundle.
--
-- If the shop later wants to read live stock in the client, add a narrow
-- select policy to products and product_variants. Do not add one to orders.
-- ---------------------------------------------------------------------------

alter table public.products         enable row level security;
alter table public.product_variants enable row level security;
alter table public.shipping_rates   enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;
alter table public.stripe_events    enable row level security;

alter table public.products         force row level security;
alter table public.product_variants force row level security;
alter table public.shipping_rates   force row level security;
alter table public.orders           force row level security;
alter table public.order_items      force row level security;
alter table public.stripe_events    force row level security;

-- Postgres grants EXECUTE on new functions to PUBLIC by default. These are
-- SECURITY DEFINER and bypass RLS, so leaving that in place would hand the
-- anon key a way to place orders and read other people's addresses.
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.place_order(jsonb, text, text)',
    'public.mark_order_paid(text, text, text, text, text, text, text, integer, integer, jsonb, jsonb)',
    'public.mark_order_closed(text, public.order_status)',
    'public.order_summary(text)',
    'public.generate_order_reference()'
  ]
  loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Seed — the collection as it stands
-- ---------------------------------------------------------------------------

insert into public.products (id, name, price_pence) values
  ('the-pearl',    'The Pearl Dress',    32500),
  ('the-florence', 'The Florence Dress', 35000)
on conflict (id) do update
  set name = excluded.name,
      price_pence = excluded.price_pence;

insert into public.product_variants (product_id, size, stock, sort_order)
select p.id, v.size, v.stock, v.sort_order
  from public.products p
 cross join (values
    ('XS',  8, 1),
    ('S',  15, 2),
    ('M',  17, 3),
    ('L',  10, 4)
 ) as v(size, stock, sort_order)
on conflict (product_id, size) do nothing;

insert into public.shipping_rates
  (id, zone, label, description, price_pence, delivery_min_days, delivery_max_days, sort_order)
values
  ('uk-standard',   'uk',            'Complimentary UK Delivery', 'Dispatched within 1–2 working days', 0,    2, 4, 1),
  ('uk-next-day',   'uk',            'Next Day Delivery',         'Order before 1pm, Monday to Thursday', 795, 1, 1, 2),
  ('international', 'international', 'International Delivery',    'Flat rate worldwide',                 2500, 5, 10, 1)
on conflict (id) do update
  set zone = excluded.zone,
      label = excluded.label,
      description = excluded.description,
      price_pence = excluded.price_pence,
      delivery_min_days = excluded.delivery_min_days,
      delivery_max_days = excluded.delivery_max_days,
      sort_order = excluded.sort_order;
