-- ===========================================================================
-- Keepalive heartbeat.
--
-- /api/keepalive (a daily Vercel cron) upserts the single row here, so the
-- free-tier project sees a real write every day as well as a read and is
-- never paused for inactivity. One row, overwritten in place: the table
-- never grows.
--
-- RLS on with no policies, like every other table: only the service-role
-- key can touch it.
-- ===========================================================================

create table if not exists public.keepalive (
  id         smallint primary key default 1 check (id = 1),
  pinged_at  timestamptz not null default now()
);

alter table public.keepalive enable row level security;

insert into public.keepalive (id) values (1) on conflict (id) do nothing;
