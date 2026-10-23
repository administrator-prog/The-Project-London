-- ===========================================================================
-- The welcome offer: 10% off a first order, for an email address.
--
-- Stripe's coupons only apply to hosted Checkout, Invoices and Subscriptions.
-- This site pays through a PaymentIntent whose amount Postgres decides, so the
-- discount lives here with every other number that makes up a total. The
-- browser sends a code; what it is worth is looked up, never sent.
--
-- An order with no code behaves exactly as before: discount_pence already
-- existed, defaulted to 0, and nothing wrote to it until now.
--
-- A code is single use. It is only spent once the money has arrived — a
-- checkout that is abandoned, or a card that is declined, leaves it usable.
-- ===========================================================================

create table if not exists public.discount_codes (
  code               text primary key,
  email              text not null,
  percent_off        integer not null check (percent_off between 1 and 50),
  source             text not null default 'welcome',
  expires_at         timestamptz not null,
  -- The exact wording the visitor agreed to, kept as the record of consent.
  marketing_consent  text,
  redeemed_at        timestamptz,
  redeemed_order_id  uuid references public.orders(id) on delete set null,
  created_at         timestamptz not null default now()
);

comment on table public.discount_codes is
  'Codes issued by the welcome popup, and the email list it collects. One '
  'welcome code per address; spent by mark_order_paid_by_intent().';

-- One welcome code per address. Asking twice gets the same code back.
create unique index if not exists discount_codes_email_source_key
  on public.discount_codes (email, source);

alter table public.discount_codes enable row level security;
alter table public.discount_codes force row level security;

alter table public.orders
  add column if not exists discount_code text references public.discount_codes(code);

-- ---------------------------------------------------------------------------
-- issue_welcome_code — the popup's single write
-- ---------------------------------------------------------------------------

/*
 * Returns { status, code, percentOff, expiresAt }.
 *
 *   new       a code was created for this address
 *   existing  this address already had one, unspent — the same code comes
 *             back, with its expiry pushed out if it had lapsed
 *   used      this address has already spent its code; no code is returned
 *
 * Codes read like order references but say what they are: WELCOME-7KQ2X9,
 * from the same alphabet without I, O, 0 and 1.
 */
create or replace function public.issue_welcome_code(
  p_email       text,
  p_percent     integer,
  p_valid_days  integer,
  p_consent     text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_email    text := lower(trim(coalesce(p_email, '')));
  v_row      public.discount_codes%rowtype;
  v_code     text;
  v_attempt  integer := 0;
begin
  if v_email = '' or position('@' in v_email) = 0 then
    raise exception 'invalid_email';
  end if;

  select * into v_row from public.discount_codes
   where email = v_email and source = 'welcome'
     for update;

  if found then
    if v_row.redeemed_at is not null then
      return jsonb_build_object('status', 'used');
    end if;

    if v_row.expires_at < now() then
      update public.discount_codes
         set expires_at = now() + make_interval(days => p_valid_days)
       where code = v_row.code
      returning * into v_row;
    end if;

    return jsonb_build_object(
      'status',     'existing',
      'code',       v_row.code,
      'percentOff', v_row.percent_off,
      'expiresAt',  v_row.expires_at
    );
  end if;

  loop
    v_code := 'WELCOME-';
    for i in 1..6 loop
      v_code := v_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;

    exit when not exists (select 1 from public.discount_codes d where d.code = v_code);

    v_attempt := v_attempt + 1;
    if v_attempt > 20 then
      raise exception 'could not allocate a unique discount code';
    end if;
  end loop;

  begin
    insert into public.discount_codes (code, email, percent_off, source, expires_at, marketing_consent)
    values (
      v_code,
      v_email,
      p_percent,
      'welcome',
      now() + make_interval(days => p_valid_days),
      p_consent
    )
    returning * into v_row;
  exception
    -- The same address submitted twice at once. The other request won; hand
    -- back its code rather than an error.
    when unique_violation then
      select * into v_row from public.discount_codes
       where email = v_email and source = 'welcome';
      return jsonb_build_object(
        'status',     'existing',
        'code',       v_row.code,
        'percentOff', v_row.percent_off,
        'expiresAt',  v_row.expires_at
      );
  end;

  return jsonb_build_object(
    'status',     'new',
    'code',       v_row.code,
    'percentOff', v_row.percent_off,
    'expiresAt',  v_row.expires_at
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- apply_discount — checkout's "Apply" button
-- ---------------------------------------------------------------------------

/*
 * Puts a code on a pending order, or takes it off again with an empty code.
 *
 * The discount is a share of the subtotal only; delivery is charged in full.
 * prepare_payment() checks the code again before the intent is created, so a
 * code that lapses between here and paying is caught there too.
 */
create or replace function public.apply_discount(
  p_client_token  uuid,
  p_code          text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order     public.orders%rowtype;
  v_discount  public.discount_codes%rowtype;
  v_code      text := upper(trim(coalesce(p_code, '')));
  v_pence     integer;
begin
  select * into v_order from public.orders
   where client_token = p_client_token
     for update;

  if not found then
    raise exception 'unknown_order';
  end if;

  if v_order.status <> 'pending' then
    raise exception 'order_closed:%', v_order.status;
  end if;

  if v_code = '' then
    update public.orders
       set discount_code  = null,
           discount_pence = 0
     where id = v_order.id
    returning * into v_order;

    return jsonb_build_object(
      'code',          null,
      'percentOff',    0,
      'discountPence', 0,
      'subtotalPence', v_order.subtotal_pence
    );
  end if;

  select * into v_discount from public.discount_codes where code = v_code;

  if not found then
    raise exception 'discount_unknown';
  end if;

  if v_discount.redeemed_at is not null
     and v_discount.redeemed_order_id is distinct from v_order.id then
    raise exception 'discount_used';
  end if;

  if v_discount.expires_at < now() then
    raise exception 'discount_expired';
  end if;

  v_pence := round(v_order.subtotal_pence * v_discount.percent_off / 100.0)::integer;

  update public.orders
     set discount_code  = v_discount.code,
         discount_pence = v_pence
   where id = v_order.id
  returning * into v_order;

  return jsonb_build_object(
    'code',          v_discount.code,
    'percentOff',    v_discount.percent_off,
    'discountPence', v_order.discount_pence,
    'subtotalPence', v_order.subtotal_pence
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- prepare_payment — now takes the discount off
-- ---------------------------------------------------------------------------

/*
 * As before, with one change to the arithmetic: the total is subtotal, less
 * any discount, plus delivery. With no code on the order the discount is 0 and
 * the total is what it always was.
 *
 * The code is checked once more here, because this is the moment the amount
 * is fixed. Spent or lapsed since it was applied, and the payment is refused
 * with a message, rather than quietly charged at full price.
 */
create or replace function public.prepare_payment(
  p_client_token uuid,
  p_rate_id      text,
  p_email        text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order     public.orders%rowtype;
  v_rate      public.shipping_rates%rowtype;
  v_discount  public.discount_codes%rowtype;
  v_off       integer := 0;
begin
  select * into v_order from public.orders
   where client_token = p_client_token
     for update;

  if not found then
    raise exception 'unknown_order';
  end if;

  if v_order.status <> 'pending' then
    raise exception 'order_closed:%', v_order.status;
  end if;

  select * into v_rate from public.shipping_rates
   where id = p_rate_id and active;

  if not found then
    raise exception 'unknown_rate:%', p_rate_id;
  end if;

  if v_rate.zone <> v_order.shipping_zone then
    raise exception 'rate_wrong_zone:%:%', v_rate.zone, v_order.shipping_zone;
  end if;

  if v_order.discount_code is not null then
    select * into v_discount from public.discount_codes where code = v_order.discount_code;

    if not found
       or v_discount.expires_at < now()
       or (v_discount.redeemed_at is not null
           and v_discount.redeemed_order_id is distinct from v_order.id) then
      raise exception 'discount_invalid';
    end if;

    v_off := round(v_order.subtotal_pence * v_discount.percent_off / 100.0)::integer;
  end if;

  update public.orders
     set shipping_rate_id = v_rate.id,
         shipping_method  = v_rate.label,
         shipping_pence   = v_rate.price_pence,
         discount_pence   = v_off,
         total_pence      = v_order.subtotal_pence - v_off + v_rate.price_pence,
         email            = coalesce(nullif(lower(trim(coalesce(p_email, ''))), ''), email)
   where id = v_order.id
  returning * into v_order;

  return jsonb_build_object(
    'id',            v_order.id,
    'reference',     v_order.reference,
    'currency',      v_order.currency,
    'subtotalPence', v_order.subtotal_pence,
    'discountPence', v_order.discount_pence,
    'shippingPence', v_order.shipping_pence,
    'totalPence',    v_order.total_pence,
    'shippingLabel', v_order.shipping_method
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- mark_order_paid_by_intent — now spends the code
-- ---------------------------------------------------------------------------

/*
 * Unchanged apart from the block marked below. The code is spent in the same
 * transaction that records the payment, and only where it is still unspent,
 * so a replayed webhook cannot move it to a different order.
 */
create or replace function public.mark_order_paid_by_intent(
  p_payment_intent    text,
  p_email             text default null,
  p_customer_name     text default null,
  p_phone             text default null,
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
  v_order     public.orders%rowtype;
  v_item      public.order_items%rowtype;
  v_already   boolean;
  v_shortfall boolean := false;
  v_country   text;
  v_mismatch  boolean := false;
  v_items     jsonb;
begin
  select * into v_order from public.orders
   where stripe_payment_intent = p_payment_intent
     for update;

  if not found then
    raise exception 'unknown_intent:%', p_payment_intent;
  end if;

  v_already := v_order.status in ('paid', 'fulfilled');

  if not v_already then
    v_country := upper(coalesce(
      p_shipping_address ->> 'country',
      v_order.shipping_address ->> 'country',
      ''
    ));

    if v_country <> '' then
      v_mismatch := (v_order.shipping_zone = 'uk'            and v_country <> 'GB')
                 or (v_order.shipping_zone = 'international' and v_country =  'GB');
    end if;

    update public.orders
       set status           = 'paid',
           paid_at          = now(),
           email            = coalesce(nullif(lower(trim(coalesce(p_email, ''))), ''), email),
           customer_name    = coalesce(p_customer_name, customer_name),
           phone            = coalesce(p_phone, phone),
           total_pence      = coalesce(p_total_pence, total_pence),
           shipping_address = coalesce(p_shipping_address, shipping_address),
           billing_address  = coalesce(p_billing_address, billing_address),
           zone_mismatch    = v_mismatch
     where id = v_order.id
    returning * into v_order;

    -- The welcome code, spent.
    if v_order.discount_code is not null then
      update public.discount_codes
         set redeemed_at       = now(),
             redeemed_order_id = v_order.id
       where code = v_order.discount_code
         and redeemed_at is null;
    end if;
  end if;

  if not v_order.stock_committed then
    for v_item in select * from public.order_items where order_id = v_order.id
    loop
      update public.product_variants
         set stock = stock - v_item.quantity
       where product_id = v_item.product_id
         and size = v_item.size
         and stock >= v_item.quantity;

      if not found then
        v_shortfall := true;
        update public.product_variants set stock = 0
         where product_id = v_item.product_id and size = v_item.size and stock > 0;
      end if;
    end loop;

    update public.orders
       set stock_committed = true, stock_shortfall = v_shortfall
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

  return jsonb_build_object('alreadyPaid', v_already, 'order', to_jsonb(v_order), 'items', v_items);
end;
$$;

-- ---------------------------------------------------------------------------
-- The confirmation page and the admin list show the discount
-- ---------------------------------------------------------------------------

create or replace function public.order_summary_by_intent(p_payment_intent text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where stripe_payment_intent = p_payment_intent;
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
    'discountPence',  v_order.discount_pence,
    'discountCode',   v_order.discount_code,
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

create or replace function public.admin_order_list(
  p_limit   integer default 100,
  p_offset  integer default 0
) returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc), '[]'::jsonb)
    from (
      select o.id,
             o.reference,
             o.status,
             o.currency,
             o.email,
             o.customer_name,
             o.phone,
             o.shipping_zone,
             o.shipping_method,
             o.shipping_address,
             o.subtotal_pence,
             o.discount_pence,
             o.discount_code,
             o.shipping_pence,
             o.total_pence,
             o.stock_shortfall,
             o.zone_mismatch,
             o.paid_at,
             o.shipped_at,
             o.tracking_carrier,
             o.tracking_number,
             o.tracking_url,
             o.shipped_email_sent_at,
             o.created_at,
             coalesce(
               (select jsonb_agg(
                         jsonb_build_object(
                           'productName',    i.product_name,
                           'size',           i.size,
                           'quantity',       i.quantity,
                           'unitPricePence', i.unit_price_pence
                         )
                         order by i.created_at
                       )
                  from public.order_items i
                 where i.order_id = o.id),
               '[]'::jsonb
             ) as items
        from public.orders o
       where o.status <> 'pending'
       order by o.created_at desc
       limit  greatest(1, least(coalesce(p_limit, 100), 200))
      offset  greatest(0, coalesce(p_offset, 0))
    ) t;
$$;

-- Same lockdown as everything else: definer functions, no public execute.
-- Repeated for the replaced ones too, which costs nothing and means this file
-- does not lean on grants surviving `create or replace`.
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.issue_welcome_code(text, integer, integer, text)',
    'public.apply_discount(uuid, text)',
    'public.prepare_payment(uuid, text, text)',
    'public.mark_order_paid_by_intent(text, text, text, text, integer, jsonb, jsonb)',
    'public.order_summary_by_intent(text)',
    'public.admin_order_list(integer, integer)'
  ]
  loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end
$$;
