-- Evening trips run the same route backwards (campus -> stops). Instead of making admins
-- draw every route twice, the tracker sees the route in travel order: shape reversed,
-- stops renumbered 0..n-1 in the order the bus reaches them. stop_events.stop_seq is that
-- travel order; stops are always identified by id when talking to the database.

create or replace function public.ingest_context(p_trip uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_trip public.trips;
  v_tz text;
  v_evening boolean;
begin
  select * into v_trip from public.trips where id = p_trip;
  if not found or v_trip.driver_id is distinct from auth.uid() or v_trip.status <> 'active' then
    raise exception 'not_your_active_trip' using errcode = '42501';
  end if;
  select timezone into v_tz from public.colleges where id = v_trip.college_id;
  v_evening := v_trip.period = 'evening';

  return (
    with r as (
      select shape, extensions.st_length(shape) as len from public.routes where id = v_trip.route_id
    ), s as (
      select st.id, st.name, st.location,
        case when v_evening then r.len - st.dist_along_m else st.dist_along_m end as along,
        (row_number() over (order by case when v_evening then -st.seq else st.seq end) - 1)::int as tseq
      from public.route_stops st, r
      where st.route_id = v_trip.route_id
    )
    select jsonb_build_object(
      'trip', jsonb_build_object(
        'id', v_trip.id, 'collegeId', v_trip.college_id, 'routeId', v_trip.route_id,
        'templateId', v_trip.template_id, 'period', v_trip.period, 'tracker', v_trip.tracker,
        'busNumber', (select number from public.buses where id = v_trip.bus_id)),
      'shape', (
        select extensions.st_asgeojson(
          case when v_evening then extensions.st_reverse(r.shape::extensions.geometry) else r.shape::extensions.geometry end
        )::jsonb -> 'coordinates' from r),
      'stops', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', s.id, 'seq', s.tseq, 'name', s.name,
          'lng', extensions.st_x(s.location::extensions.geometry),
          'lat', extensions.st_y(s.location::extensions.geometry),
          'along', s.along,
          'scheduledAt', (
            select extract(epoch from ((v_trip.service_date + tt.scheduled_time) at time zone v_tz)) * 1000
            from public.template_stop_times tt
            where tt.template_id = v_trip.template_id and tt.stop_id = s.id)
        ) order by s.tseq)
        from s), '[]'::jsonb),
      'history', coalesce((
        select jsonb_agg(jsonb_build_object('fromSeq', h.from_seq, 'seconds', h.seconds, 'trips', h.trips))
        from (
          select a.stop_seq as from_seq,
                 avg(extract(epoch from (b.arrived_at - coalesce(a.departed_at, a.arrived_at))))::int as seconds,
                 count(*)::int as trips
          from public.stop_events a
          join public.stop_events b on b.trip_id = a.trip_id and b.stop_seq = a.stop_seq + 1
          join public.trips t on t.id = a.trip_id
          where t.template_id = v_trip.template_id and t.status = 'completed'
            and t.service_date > v_trip.service_date - 60
            and a.arrived_at is not null and b.arrived_at is not null
            and not a.skipped and not b.skipped
          group by a.stop_seq
        ) h), '[]'::jsonb)
    )
  );
end $$;

create or replace function public.record_position(p_trip uuid, p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_trip public.trips;
  v_event jsonb;
  v_at timestamptz := to_timestamp((p ->> 't')::double precision / 1000);
  v_payload jsonb;
begin
  select * into v_trip from public.trips where id = p_trip for update;
  if not found or v_trip.driver_id is distinct from auth.uid() or v_trip.status <> 'active' then
    raise exception 'not_your_active_trip' using errcode = '42501';
  end if;

  update public.trips set
    last_lng = (p ->> 'lng')::double precision,
    last_lat = (p ->> 'lat')::double precision,
    last_fix_at = v_at,
    progress_m = (p ->> 'progress')::double precision,
    speed_mps = (p ->> 'speed')::double precision,
    off_route = coalesce((p ->> 'offRoute')::boolean, false),
    delay_s = (p ->> 'delaySec')::integer,
    done_seq = (p ->> 'doneSeq')::integer,
    stop_etas = coalesce(p -> 'etas', '[]'::jsonb),
    tracker = p -> 'tracker'
  where id = p_trip;

  if coalesce((p ->> 'breadcrumb')::boolean, false) then
    insert into public.breadcrumbs (trip_id, college_id, recorded_at, location, accuracy_m, speed_mps, progress_m)
    values (p_trip, v_trip.college_id, v_at,
      extensions.st_setsrid(extensions.st_makepoint((p ->> 'lng')::float8, (p ->> 'lat')::float8), 4326)::extensions.geography,
      (p ->> 'accuracy')::real, (p ->> 'speed')::real, (p ->> 'progress')::float8);
  end if;

  for v_event in select * from jsonb_array_elements(coalesce(p -> 'events', '[]'::jsonb)) loop
    insert into public.stop_events (trip_id, college_id, stop_seq, stop_id, arrived_at, departed_at, skipped)
    values (
      p_trip, v_trip.college_id, (v_event ->> 'seq')::int,
      (select id from public.route_stops where route_id = v_trip.route_id and id = (v_event ->> 'stopId')::uuid),
      case when v_event ->> 'type' = 'arrive' then to_timestamp((v_event ->> 't')::float8 / 1000) end,
      case when v_event ->> 'type' = 'depart' then to_timestamp((v_event ->> 't')::float8 / 1000) end,
      v_event ->> 'type' = 'skip')
    on conflict (trip_id, stop_seq) do update set
      arrived_at = coalesce(public.stop_events.arrived_at, excluded.arrived_at),
      departed_at = coalesce(excluded.departed_at, public.stop_events.departed_at),
      skipped = public.stop_events.skipped and excluded.skipped;
  end loop;

  v_payload := jsonb_build_object(
    'tripId', p_trip, 'lng', p -> 'lng', 'lat', p -> 'lat', 't', p -> 't',
    'progress', p -> 'progress', 'speed', p -> 'speed', 'delaySec', p -> 'delaySec',
    'doneSeq', p -> 'doneSeq', 'etas', coalesce(p -> 'etas', '[]'::jsonb), 'offRoute', p -> 'offRoute');
  perform realtime.send(v_payload, 'position', 'trip:' || p_trip, true);
  perform realtime.send(v_payload, 'position', 'college:' || v_trip.college_id, true);

  if coalesce((p ->> 'completed')::boolean, false) then
    perform private.finish_trip(p_trip, 'last_stop');
  end if;
end $$;

drop function public.claim_arrival_alerts(uuid, integer[]);

create function public.claim_arrival_alerts(p_trip uuid, p_stop_ids uuid[])
returns table (user_id uuid, token text, stop_id uuid, stop_name text, bus_number text)
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
    where rp.alerts and rp.stop_id = any (p_stop_ids)
  ), claimed as (
    insert into public.notification_log (trip_id, user_id, kind, stop_id)
    select p_trip, due.user_id, 'eta5', due.stop_id from due
    on conflict do nothing
    returning notification_log.user_id, notification_log.stop_id
  )
  select c.user_id, pt.token, s.id, s.name, b.number
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

revoke execute on function public.claim_arrival_alerts(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.claim_arrival_alerts(uuid, uuid[]) to service_role;
