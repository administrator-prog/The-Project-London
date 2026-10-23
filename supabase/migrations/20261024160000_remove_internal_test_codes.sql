-- ===========================================================================
-- Internal test codes are gone.
--
-- 20261024150000 let a hand-made 'internal_test' code go up to 99% off, for
-- one end-to-end test payment. That test is done. This deletes every such
-- code and puts the ceiling back at 50% for all codes, so a code worth more
-- than half the order cannot be stored at all.
--
-- The order the test was paid with keeps its figures — it really was charged
-- the discounted amount — but no longer points at a code that does not
-- exist, and says in its notes what it was.
-- ===========================================================================

update public.orders o
   set notes = concat_ws(E'\n', nullif(o.notes, ''),
                 'Internal end-to-end test payment with a 99% code; refunded. Code deleted.'),
       discount_code = null
  from public.discount_codes d
 where d.code = o.discount_code
   and d.source = 'internal_test';

delete from public.discount_codes where source = 'internal_test';

-- Anything else above 50% would make the constraint below fail to apply,
-- which is the right outcome: stop and look, rather than delete it silently.
alter table public.discount_codes
  drop constraint if exists discount_codes_percent_off_check;

alter table public.discount_codes
  add constraint discount_codes_percent_off_check check (percent_off between 1 and 50);
