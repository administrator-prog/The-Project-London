-- ===========================================================================
-- Name the carriers.
--
-- These labels are what Stripe prints on the payment page, so they have to
-- match the Shipping page word for word. "Next Day Delivery" against "DPD Next
-- Day" is the kind of small mismatch that makes a customer wonder whether they
-- are still on the right site.
-- ===========================================================================

update public.shipping_rates
   set label = 'Royal Mail Standard',
       description = 'Dispatched within 1–2 working days'
 where id = 'uk-standard';

update public.shipping_rates
   set label = 'DPD Next Day',
       description = 'Order before 1pm, Monday to Thursday'
 where id = 'uk-next-day';

update public.shipping_rates
   set label = 'International Delivery',
       description = 'Flat rate worldwide — duties payable on delivery'
 where id = 'international';
