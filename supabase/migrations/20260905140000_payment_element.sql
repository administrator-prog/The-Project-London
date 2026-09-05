-- ===========================================================================
-- Moving from hosted Checkout to an on-site Payment Element.
--
-- The payment is now a PaymentIntent rather than a Checkout Session, and the
-- shipping rate is chosen on our own page rather than Stripe's. That moves one
-- more number under our control, so it moves under Postgres's control too: the
-- browser sends a *rate id*, and prepare_payment() looks up what that costs.
-- The client still never sends an amount, for shipping or for anything else.
-- ===========================================================================

-- A per-order secret. The browser is handed this once when the order is
-- created and must present it to choose shipping or to pay. Order ids appear
-- in logs and metadata; this does not, so it is the thing that authorises a
-- mutation rather than the id.
alter table public.orders
  add column if not exists client_token uuid not null default gen_random_uuid();

alter table public.orders
  add column if not exists shipping_rate_id text references public.shipping_rates(id);

create unique index if not exists orders_client_token_key
  on public.orders (client_token);

create unique index if not exists orders_stripe_payment_intent_key
  on public.orders (stripe_payment_intent)
  where stripe_payment_intent is not null;

comment on column public.orders.client_token is
  'Bearer secret for this one order. Unguessable, single-order scope, and '
  'useless once the order leaves pending.';

-- ---------------------------------------------------------------------------
-- place_order now hands back the token as well
-- ---------------------------------------------------------------------------

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

    if (v_product_id || '::' || v_size) = any (v_seen) then
      raise exception 'duplicate_line';
    end if;
    v_seen := v_seen || (v_product_id || '::' || v_size);

    select * into v_product from public.products where id = v_product_id and active;
    if not found then
      raise exception 'unknown_product:%', v_product_id;
    end if;

    select * into v_variant from public.product_variants
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

  update public.orders set subtotal_pence = v_subtotal
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
    'id',            v_order.id,
    'clientToken',   v_order.client_token,
    'reference',     v_order.reference,
    'currency',      v_order.currency,
    'subtotalPence', v_order.subtotal_pence,
    'shippingZone',  v_order.shipping_zone,
    'items',         v_items
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- prepare_payment — prices the shipping choice
-- ---------------------------------------------------------------------------

/*
 * The browser picks a shipping rate by id and this decides what it costs.
 *
 * The rate must belong to the zone the order was placed in, which stops the
 * obvious trick: placing an international order and then paying the £0 UK
 * rate. The total it returns is the amount the PaymentIntent is created with,
 * and it is stored on the order at the same moment, so what was quoted and
 * what is charged cannot drift apart.
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
  v_order public.orders%rowtype;
  v_rate  public.shipping_rates%rowtype;
begin
  select * into v_order from public.orders
   where client_token = p_client_token
     for update;

  if not found then
    raise exception 'unknown_order';
  end if;

  -- Anything past pending has either been paid or closed out. Re-pricing it
  -- would be repricing a completed sale.
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

  update public.orders
     set shipping_rate_id = v_rate.id,
         shipping_method  = v_rate.label,
         shipping_pence   = v_rate.price_pence,
         total_pence      = v_order.subtotal_pence + v_rate.price_pence,
         email            = coalesce(nullif(lower(trim(coalesce(p_email, ''))), ''), email)
   where id = v_order.id
  returning * into v_order;

  return jsonb_build_object(
    'id',            v_order.id,
    'reference',     v_order.reference,
    'currency',      v_order.currency,
    'subtotalPence', v_order.subtotal_pence,
    'shippingPence', v_order.shipping_pence,
    'totalPence',    v_order.total_pence,
    'shippingLabel', v_order.shipping_method
  );
end;
$$;

/* Records which PaymentIntent belongs to this order, once Stripe has made it. */
create or replace function public.attach_payment_intent(
  p_client_token    uuid,
  p_payment_intent  text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
     set stripe_payment_intent = p_payment_intent
   where client_token = p_client_token
     and status = 'pending';

  if not found then
    raise exception 'unknown_order';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- The webhook now speaks PaymentIntents
-- ---------------------------------------------------------------------------

/*
 * Identical in spirit to mark_order_paid(), which keyed on a Checkout Session.
 * Same guarantees: safe to replay, and a stock shortfall flags the order
 * rather than failing a payment that has already been taken.
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
    update public.orders
       set status           = 'paid',
           paid_at          = now(),
           email            = coalesce(nullif(lower(trim(coalesce(p_email, ''))), ''), email),
           customer_name    = coalesce(p_customer_name, customer_name),
           phone            = coalesce(p_phone, phone),
           total_pence      = coalesce(p_total_pence, total_pence),
           shipping_address = coalesce(p_shipping_address, shipping_address),
           billing_address  = coalesce(p_billing_address, billing_address)
     where id = v_order.id
    returning * into v_order;
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

create or replace function public.mark_intent_closed(
  p_payment_intent text,
  p_status         public.order_status
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
     set status = p_status, cancelled_at = now()
   where stripe_payment_intent = p_payment_intent
     and status = 'pending';
end;
$$;

/* The confirmation page's view, keyed on the intent Stripe redirects back with. */
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

-- Same lockdown as everything else: definer functions, no public execute.
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.place_order(jsonb, text, text)',
    'public.prepare_payment(uuid, text, text)',
    'public.attach_payment_intent(uuid, text)',
    'public.mark_order_paid_by_intent(text, text, text, text, integer, jsonb, jsonb)',
    'public.mark_intent_closed(text, public.order_status)',
    'public.order_summary_by_intent(text)'
  ]
  loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end
$$;
