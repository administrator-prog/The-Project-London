-- ---------------------------------------------------------------------------
-- Shipping an order, and telling the customer about it.
--
-- `fulfilled` already existed in the order_status enum and nothing ever set
-- it. It is the shipped state, and this is what sets it.
--
-- The email stamp follows the same rule as the confirmation and studio ones:
-- claimed before the send, released if the send fails. The admin screen is a
-- button somebody can press twice.
-- ---------------------------------------------------------------------------

alter table public.orders
  add column if not exists shipped_at             timestamptz,
  add column if not exists tracking_carrier       text,
  add column if not exists tracking_number        text,
  add column if not exists tracking_url           text,
  add column if not exists shipped_email_sent_at  timestamptz;

comment on column public.orders.shipped_at is
  'Set once, by mark_order_shipped(). Its presence is what makes the order '
  'shipped — status is derived from it, not the other way round.';

create index if not exists orders_shipped_at_idx on public.orders (shipped_at);

-- ---------------------------------------------------------------------------
-- Marking it shipped
-- ---------------------------------------------------------------------------

create or replace function public.mark_order_shipped(
  p_order_id  uuid,
  p_carrier   text default null,
  p_tracking  text default null,
  p_url       text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order    public.orders%rowtype;
  v_already  boolean;
begin
  -- Row lock: two admins on the same order must not both send the email.
  select * into v_order from public.orders where id = p_order_id for update;

  if not found then
    raise exception 'unknown_order';
  end if;

  -- Never announce a dispatch for money that has not arrived.
  if v_order.status not in ('paid', 'fulfilled') then
    raise exception 'order_not_paid:%', v_order.status;
  end if;

  v_already := v_order.shipped_at is not null;

  if not v_already then
    update public.orders
       set status            = 'fulfilled',
           shipped_at        = now(),
           tracking_carrier  = nullif(btrim(coalesce(p_carrier, '')), ''),
           tracking_number   = nullif(btrim(coalesce(p_tracking, '')), ''),
           tracking_url      = nullif(btrim(coalesce(p_url, '')), ''),
           updated_at        = now()
     where id = p_order_id
    returning * into v_order;
  end if;

  return jsonb_build_object(
    'alreadyShipped', v_already,
    'order', to_jsonb(v_order),
    'items', coalesce(
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
        where i.order_id = v_order.id),
      '[]'::jsonb
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- What the admin screen reads
--
-- Deliberately not the order row. No payment intent, no Stripe customer id,
-- no internal bookkeeping beyond the two flags a person has to act on.
--
-- `pending` is excluded: those are bags somebody opened and walked away from,
-- and there are more of them than there are orders.
-- ---------------------------------------------------------------------------

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
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.mark_order_shipped(uuid, text, text, text)',
    'public.admin_order_list(integer, integer)'
  ]
  loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end
$$;
