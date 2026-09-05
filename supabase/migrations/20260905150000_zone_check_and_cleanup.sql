-- ===========================================================================
-- Check the destination against what was paid for it, and clear out the
-- session-era functions.
--
-- Hosted Checkout enforced an allowed-country list on Stripe's side. On our
-- own page the address form restricts countries in the browser only, which is
-- a UI nicety and not a control — a crafted request could pair a UK order, and
-- its £0 delivery, with an address in California.
--
-- So the country is checked against the zone once the payment lands. As with
-- a stock shortfall, this never fails a paid order: the money is in, and the
-- studio decides whether to ship it, ask for the difference, or refund.
-- ===========================================================================

alter table public.orders
  add column if not exists zone_mismatch boolean not null default false;

comment on column public.orders.zone_mismatch is
  'The delivery address does not belong to the zone the order was priced for '
  '— a UK order going abroad, or an international one going to a UK address. '
  'Flagged for the studio rather than refused.';

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
    -- Does the destination match what was charged for delivery?
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

revoke all on function
  public.mark_order_paid_by_intent(text, text, text, text, integer, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function
  public.mark_order_paid_by_intent(text, text, text, text, integer, jsonb, jsonb)
  to service_role;

-- The Checkout Session era. Nothing calls these now, and leaving two ways to
-- mark an order paid in a payments schema is how the wrong one gets used.
drop function if exists public.mark_order_paid(
  text, text, text, text, text, text, text, integer, integer, jsonb, jsonb
);
drop function if exists public.mark_order_closed(text, public.order_status);
drop function if exists public.order_summary(text);
