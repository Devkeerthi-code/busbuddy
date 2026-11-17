-- Server-side operations. Each one checks who is calling before touching data.

-- Drivers assigned to templates/trips must be drivers of the same college.
create function private.check_driver_assignment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.driver_id is not null and not exists (
    select 1 from public.memberships m
    where m.user_id = new.driver_id and m.college_id = new.college_id and m.role = 'driver'
  ) then
    raise exception 'driver_not_in_college' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger trip_templates_driver_check before insert or update of driver_id on public.trip_templates
  for each row execute function private.check_driver_assignment();
create trigger trips_driver_check before insert or update of driver_id on public.trips
  for each row execute function private.check_driver_assignment();

-- A college must always keep at least one transport admin.
create function private.keep_one_admin() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.role = 'transport_admin'
     and (tg_op = 'DELETE' or new.role <> 'transport_admin')
     and not exists (
       select 1 from public.memberships
       where college_id = old.college_id and role = 'transport_admin' and user_id <> old.user_id)
     and exists (select 1 from public.colleges where id = old.college_id) then
    raise exception 'last_admin' using errcode = '23514';
  end if;
  return coalesce(new, old);
end $$;

create trigger memberships_keep_admin before update of role or delete on public.memberships
  for each row execute function private.keep_one_admin();

create function private.generate_invite_code() returns text
language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(6);
  out text := '';
begin
  for i in 0..5 loop
    out := out || substr(alphabet, 1 + (get_byte(bytes, i) % length(alphabet)), 1);
  end loop;
  return out;
end $$;

create function private.new_invite_code(p_college uuid, p_role public.member_role) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_code text;
begin
  loop
    v_code := private.generate_invite_code();
    begin
      insert into public.invite_codes (code, college_id, role) values (v_code, p_college, p_role)
      on conflict (college_id, role) do update set code = excluded.code, created_at = now();
      return v_code;
    exception when unique_violation then
      -- collided with another college's code; draw again
    end;
  end loop;
end $$;

create function private.bump(p_college uuid, p_metric text, p_by integer default 1) returns void
language sql volatile security definer set search_path = '' as $$
  insert into public.usage_daily (college_id, metric, day, count)
  values (p_college, p_metric, current_date, p_by)
  on conflict (college_id, metric, day) do update set count = public.usage_daily.count + excluded.count
$$;

create function public.track_event(p_metric text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_metric not in ('rider_opened_live', 'rider_set_stop') then
    raise exception 'unknown_metric' using errcode = '22023';
  end if;
  perform private.bump(private.my_college(), p_metric);
end $$;

create function public.create_college(p_name text, p_campus text, p_display_name text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_college uuid;
begin
  if v_uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  if exists (select 1 from public.memberships where user_id = v_uid) then
    raise exception 'already_member' using errcode = '23505';
  end if;
  insert into public.colleges (name, campus_name, created_by)
  values (btrim(p_name), btrim(p_campus), v_uid) returning id into v_college;
  insert into public.memberships (user_id, college_id, role, display_name)
  values (v_uid, v_college, 'transport_admin', btrim(p_display_name));
  perform private.new_invite_code(v_college, 'rider');
  perform private.new_invite_code(v_college, 'driver');
  perform private.bump(v_college, 'college_created');
  return v_college;
end $$;

create function public.join_college(p_code text, p_display_name text)
returns table (college_id uuid, college_name text, role public.member_role)
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[\s-]', '', 'g'));
  v_invite public.invite_codes;
  v_existing public.memberships;
begin
  if v_uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  if (select count(*) from private.join_attempts a
      where a.user_id = v_uid and a.attempted_at > now() - interval '10 minutes') >= 10 then
    raise exception 'too_many_attempts' using errcode = '54000';
  end if;
  insert into private.join_attempts (user_id) values (v_uid);

  select * into v_invite from public.invite_codes where code = v_code;
  if not found then raise exception 'invalid_code' using errcode = '22023'; end if;

  select * into v_existing from public.memberships where user_id = v_uid;
  if found then
    if v_existing.college_id <> v_invite.college_id then
      raise exception 'already_member' using errcode = '23505';
    end if;
  else
    insert into public.memberships (user_id, college_id, role, display_name)
    values (v_uid, v_invite.college_id, v_invite.role, btrim(p_display_name));
    perform private.bump(v_invite.college_id, 'member_joined');
  end if;

  return query
    select c.id, c.name, m.role
    from public.colleges c join public.memberships m on m.college_id = c.id
    where m.user_id = v_uid;
end $$;

create function public.rotate_invite_code(p_role public.member_role) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_college uuid := private.my_college();
begin
  if not private.is_admin_of(v_college) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_role not in ('rider', 'driver') then raise exception 'bad_role' using errcode = '22023'; end if;
  return private.new_invite_code(v_college, p_role);
end $$;

create function private.college_today(p_college uuid) returns date
language sql stable security definer set search_path = '' as $$
  select (now() at time zone c.timezone)::date from public.colleges c where c.id = p_college
$$;

-- Materialise today's trips from the weekly templates (idempotent).
create function public.ensure_today_trips() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_college uuid := private.my_college();
  v_today date;
begin
  if v_college is null then return; end if;
  v_today := private.college_today(v_college);
  insert into public.trips (college_id, template_id, route_id, bus_id, driver_id, period, service_date)
  select t.college_id, t.id, t.route_id, t.bus_id, t.driver_id, t.period, v_today
  from public.trip_templates t
  where t.college_id = v_college and t.active
    and extract(dow from v_today)::smallint = any (t.weekdays)
  on conflict (template_id, service_date) do nothing;
end $$;

create function public.start_trip(p_trip uuid) returns public.trips
language plpgsql security definer set search_path = '' as $$
declare
  v_trip public.trips;
begin
  update public.trips t
  set status = 'active', started_at = now(), tracker = null, progress_m = 0, done_seq = -1,
      stop_etas = '[]'::jsonb, delay_s = null, last_fix_at = null
  where t.id = p_trip
    and t.driver_id = auth.uid()
    and t.status = 'scheduled'
    and t.service_date = private.college_today(t.college_id)
  returning * into v_trip;
  if not found then raise exception 'cannot_start_trip' using errcode = '42501'; end if;
  perform private.bump(v_trip.college_id, 'trip_started');
  perform realtime.send(
    jsonb_build_object('tripId', v_trip.id, 'status', 'active'),
    'status', 'trip:' || v_trip.id, true);
  return v_trip;
end $$;

create function private.finish_trip(p_trip uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_trip public.trips;
begin
  update public.trips set status = 'completed', ended_at = now(), end_reason = p_reason
  where id = p_trip and status = 'active' returning * into v_trip;
  if found then
    perform private.bump(v_trip.college_id, 'trip_completed');
    perform realtime.send(jsonb_build_object('tripId', p_trip, 'status', 'completed'), 'status', 'trip:' || p_trip, true);
    perform realtime.send(jsonb_build_object('tripId', p_trip, 'status', 'completed'), 'status', 'college:' || v_trip.college_id, true);
  end if;
end $$;

create function public.end_trip(p_trip uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_trip public.trips;
begin
  select * into v_trip from public.trips where id = p_trip;
  if not found or not (v_trip.driver_id = auth.uid() or private.is_admin_of(v_trip.college_id)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform private.finish_trip(p_trip, case when v_trip.driver_id = auth.uid() then 'driver' else 'admin' end);
end $$;

-- Everything the ingest function needs to process one fix, in one round trip.
create function public.ingest_context(p_trip uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_trip public.trips;
  v_tz text;
begin
  select * into v_trip from public.trips where id = p_trip;
  if not found or v_trip.driver_id is distinct from auth.uid() or v_trip.status <> 'active' then
    raise exception 'not_your_active_trip' using errcode = '42501';
  end if;
  select timezone into v_tz from public.colleges where id = v_trip.college_id;

  return jsonb_build_object(
    'trip', jsonb_build_object(
      'id', v_trip.id, 'collegeId', v_trip.college_id, 'routeId', v_trip.route_id,
      'templateId', v_trip.template_id, 'period', v_trip.period, 'tracker', v_trip.tracker,
      'busNumber', (select number from public.buses where id = v_trip.bus_id)),
    'shape', (select extensions.st_asgeojson(r.shape)::jsonb -> 'coordinates' from public.routes r where r.id = v_trip.route_id),
    'stops', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'seq', s.seq, 'name', s.name,
        'lng', extensions.st_x(s.location::extensions.geometry),
        'lat', extensions.st_y(s.location::extensions.geometry),
        'along', s.dist_along_m,
        'scheduledAt', (select extract(epoch from ((v_trip.service_date + st.scheduled_time) at time zone v_tz)) * 1000
                        from public.template_stop_times st
                        where st.template_id = v_trip.template_id and st.stop_id = s.id)
      ) order by s.seq)
      from public.route_stops s where s.route_id = v_trip.route_id), '[]'::jsonb),
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
  );
end $$;

-- Apply one processed fix: live state, breadcrumb, stop events, broadcast. Driver-only.
create function public.record_position(p_trip uuid, p jsonb) returns void
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
      (select id from public.route_stops where route_id = v_trip.route_id and seq = (v_event ->> 'seq')::int),
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

-- Atomically claim "about 5 minutes away" alerts. The notification_log primary key makes
-- a second claim for the same (trip, student) a no-op, so retries can never double-send.
create function public.claim_arrival_alerts(p_trip uuid, p_stop_seqs integer[])
returns table (user_id uuid, token text, stop_name text, bus_number text)
language plpgsql security definer set search_path = '' as $$
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
  select c.user_id, pt.token, s.name, b.number
  from claimed c
  join public.push_tokens pt on pt.user_id = c.user_id
  join public.route_stops s on s.id = c.stop_id
  join trip on true
  join public.buses b on b.id = trip.bus_id;
end $$;

-- Rebuild a route's straight-line shape from its stops and re-measure every stop along it.
create function private.refresh_route_geometry(p_route uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_source text;
  v_len double precision;
begin
  select shape_source into v_source from public.routes where id = p_route;
  if v_source = 'stops' then
    update public.routes r set shape = (
      select case when count(*) >= 2
        then extensions.st_makeline(s.location::extensions.geometry order by s.seq)::extensions.geography end
      from public.route_stops s where s.route_id = p_route)
    where r.id = p_route;
  end if;

  select extensions.st_length(shape) into v_len from public.routes where id = p_route;
  update public.route_stops s set dist_along_m = coalesce(
    extensions.st_linelocatepoint(r.shape::extensions.geometry, s.location::extensions.geometry) * v_len, 0)
  from public.routes r where r.id = p_route and s.route_id = p_route;
end $$;

-- Save the full ordered stop list of a route in one go (admins edit the list, then save).
create function public.save_route_stops(p_route uuid, p_stops jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_college uuid;
  v_stop jsonb;
  v_seq integer := 0;
  v_keep uuid[] := '{}';
begin
  select college_id into v_college from public.routes where id = p_route;
  if v_college is null or not private.is_admin_of(v_college) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if jsonb_typeof(p_stops) <> 'array' or jsonb_array_length(p_stops) > 60 then
    raise exception 'bad_stops' using errcode = '22023';
  end if;

  select coalesce(array_agg((e ->> 'id')::uuid), '{}') into v_keep
  from jsonb_array_elements(p_stops) e where e ? 'id' and e ->> 'id' is not null;
  delete from public.route_stops where route_id = p_route and not (id = any (v_keep));

  for v_stop in select * from jsonb_array_elements(p_stops) loop
    if v_stop ->> 'id' is not null then
      update public.route_stops set
        seq = v_seq, name = btrim(v_stop ->> 'name'),
        location = extensions.st_setsrid(extensions.st_makepoint((v_stop ->> 'lng')::float8, (v_stop ->> 'lat')::float8), 4326)::extensions.geography
      where id = (v_stop ->> 'id')::uuid and route_id = p_route;
    else
      insert into public.route_stops (route_id, college_id, seq, name, location)
      values (p_route, v_college, v_seq, btrim(v_stop ->> 'name'),
        extensions.st_setsrid(extensions.st_makepoint((v_stop ->> 'lng')::float8, (v_stop ->> 'lat')::float8), 4326)::extensions.geography);
    end if;
    v_seq := v_seq + 1;
  end loop;

  perform private.refresh_route_geometry(p_route);
end $$;

-- "Use this trip's path as the route shape": follows real roads without a paid routing API.
create function public.set_route_shape_from_trip(p_trip uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_trip public.trips;
begin
  select * into v_trip from public.trips where id = p_trip;
  if not found or not private.is_admin_of(v_trip.college_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if (select count(*) from public.breadcrumbs where trip_id = p_trip) < 5 then
    raise exception 'not_enough_path' using errcode = '22023';
  end if;
  update public.routes set shape_source = 'trip', shape = (
    select extensions.st_simplifypreservetopology(
      extensions.st_makeline(b.location::extensions.geometry order by b.recorded_at), 0.00005)::extensions.geography
    from public.breadcrumbs b where b.trip_id = p_trip)
  where id = v_trip.route_id;
  perform private.refresh_route_geometry(v_trip.route_id);
end $$;

-- Route shapes and stops as GeoJSON-friendly JSON for the map screens.
create function public.route_geometry(p_route uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'routeId', r.id,
    'name', r.name,
    'shape', extensions.st_asgeojson(r.shape)::jsonb -> 'coordinates',
    'stops', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'seq', s.seq, 'name', s.name, 'along', s.dist_along_m,
        'lng', extensions.st_x(s.location::extensions.geometry),
        'lat', extensions.st_y(s.location::extensions.geometry)) order by s.seq)
      from public.route_stops s where s.route_id = r.id), '[]'::jsonb))
  from public.routes r
  where r.id = p_route and private.is_member(r.college_id)
$$;

-- Who can call what. Supabase grants EXECUTE to anon by default; close that.
revoke execute on all functions in schema public from public, anon;
revoke execute on all functions in schema private from public, anon;
grant execute on function
  public.track_event(text), public.create_college(text, text, text), public.join_college(text, text),
  public.rotate_invite_code(public.member_role), public.ensure_today_trips(), public.start_trip(uuid),
  public.end_trip(uuid), public.ingest_context(uuid), public.record_position(uuid, jsonb),
  public.save_route_stops(uuid, jsonb), public.set_route_shape_from_trip(uuid), public.route_geometry(uuid)
  to authenticated;
revoke execute on function public.claim_arrival_alerts(uuid, integer[]) from authenticated;
grant execute on function public.claim_arrival_alerts(uuid, integer[]) to service_role;
