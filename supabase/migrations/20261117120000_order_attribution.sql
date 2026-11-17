-- Which advert, campaign or link brought each order in.
--
-- The browser keeps the utm_* tags from the landing URL (src/lib/attribution.ts)
-- and /api/pay writes them here while the order is still pending, so every
-- paid order carries its source independently of Meta's own reporting.
--
-- Shape: { utm_source, utm_medium, utm_campaign, utm_content, utm_term,
--          fbclid: boolean, landing_path, referrer, captured_at }, any of them
-- absent. Null when the visitor arrived untagged or opted out of cookies.

alter table public.orders
  add column if not exists attribution jsonb;

-- The order book shows it, so admin_order_list returns it.
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
             o.attribution,
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
