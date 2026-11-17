-- Scheduled housekeeping with pg_cron.
create extension if not exists pg_cron;

-- Breadcrumbs are kept 7 days: enough to learn segment times (stop_events keep the summary).
select cron.schedule(
  'busbuddy-purge-breadcrumbs', '15 3 * * *',
  $$delete from public.breadcrumbs where recorded_at < now() - interval '7 days'$$
);

-- A phone that died mid-trip shouldn't leave a bus "live" forever.
create function private.close_stale_trips() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  for v_id in
    select id from public.trips
    where status = 'active' and coalesce(last_fix_at, started_at) < now() - interval '30 minutes'
  loop
    perform private.finish_trip(v_id, 'no_signal');
  end loop;
end $$;

select cron.schedule('busbuddy-close-stale-trips', '*/10 * * * *', $$select private.close_stale_trips()$$);

-- Join attempts are only needed for the 10-minute rate limit window.
select cron.schedule(
  'busbuddy-purge-join-attempts', '30 3 * * *',
  $$delete from private.join_attempts where attempted_at < now() - interval '1 day'$$
);
