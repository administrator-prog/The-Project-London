-- ===========================================================================
-- No code may take more than 20% off. The welcome offer is 10%.
--
-- Enforced by the database, so it holds whatever writes the row — the site,
-- the SQL editor, or anything added later. Raising it means changing this
-- constraint on purpose.
-- ===========================================================================

alter table public.discount_codes
  drop constraint if exists discount_codes_percent_off_check;

alter table public.discount_codes
  add constraint discount_codes_percent_off_check check (percent_off between 1 and 20);
