-- Return the stop's position so the push text can show that stop's own ETA, and count pushes sent.
drop function public.claim_arrival_alerts(uuid, integer[]);

create function public.claim_arrival_alerts(p_trip uuid, p_stop_seqs integer[])
returns table (user_id uuid, token text, stop_seq integer, stop_name text, bus_number text)
language plpgsql security definer set search_path = '' as $$
declare
  v_sent integer;
begin
  return query
  with trip as (
    select t.* from public.trips t where t.id = p_trip and t.status = 'active'
  ), due as (
    select rp.user_id, rp.stop_id
    from public.rider_prefs rp
    join trip on rp.route_id = trip.route_id and rp.period = trip.period and rp.college_id = trip.college_id
    join public.route_stops s on s.id = rp.stop_id
    where rp.alerts and s.seq = any (p_stop_seqs)
  ), claimed as (
    insert into public.notification_log (trip_id, user_id, kind, stop_id)
    select p_trip, due.user_id, 'eta5', due.stop_id from due
    on conflict do nothing
    returning notification_log.user_id, notification_log.stop_id
  )
  select c.user_id, pt.token, s.seq, s.name, b.number
  from claimed c
  join public.push_tokens pt on pt.user_id = c.user_id
  join public.route_stops s on s.id = c.stop_id
  join trip on true
  join public.buses b on b.id = trip.bus_id;

  get diagnostics v_sent = row_count;
  if v_sent > 0 then
    perform private.bump((select college_id from public.trips where id = p_trip), 'alert_sent', v_sent);
  end if;
end $$;

revoke execute on function public.claim_arrival_alerts(uuid, integer[]) from public, anon, authenticated;
grant execute on function public.claim_arrival_alerts(uuid, integer[]) to service_role;
