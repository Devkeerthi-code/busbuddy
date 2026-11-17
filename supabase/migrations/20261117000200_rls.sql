-- Row Level Security. Every table is closed by default; policies open exactly what each role needs.
-- Helpers are SECURITY DEFINER so policies on memberships don't recurse into themselves.

create function private.my_college() returns uuid
language sql stable security definer set search_path = '' as $$
  select college_id from public.memberships where user_id = (select auth.uid())
$$;

create function private.is_member(p_college uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships
    where user_id = (select auth.uid()) and college_id = p_college
  )
$$;

create function private.is_admin_of(p_college uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships
    where user_id = (select auth.uid()) and college_id = p_college and role = 'transport_admin'
  )
$$;

create function private.is_platform_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_admins where user_id = (select auth.uid()))
$$;

grant usage on schema private to authenticated;
grant execute on function private.my_college(), private.is_member(uuid),
  private.is_admin_of(uuid), private.is_platform_admin() to authenticated;
revoke all on all tables in schema private from anon, authenticated;

alter table public.colleges enable row level security;
alter table public.invite_codes enable row level security;
alter table public.memberships enable row level security;
alter table public.platform_admins enable row level security;
alter table public.routes enable row level security;
alter table public.route_stops enable row level security;
alter table public.buses enable row level security;
alter table public.trip_templates enable row level security;
alter table public.template_stop_times enable row level security;
alter table public.trips enable row level security;
alter table public.breadcrumbs enable row level security;
alter table public.stop_events enable row level security;
alter table public.rider_prefs enable row level security;
alter table public.push_tokens enable row level security;
alter table public.notification_log enable row level security;
alter table public.usage_daily enable row level security;

-- Nothing is readable without signing in.
revoke all on all tables in schema public from anon;

-- colleges: members read their own; platform admins read all; admins rename. Created via create_college().
create policy colleges_read on public.colleges for select to authenticated
  using (private.is_member(id) or private.is_platform_admin());
create policy colleges_admin_update on public.colleges for update to authenticated
  using (private.is_admin_of(id)) with check (private.is_admin_of(id));
revoke insert, update, delete on public.colleges from authenticated;
grant update (name, campus_name, timezone) on public.colleges to authenticated;

create policy invite_codes_admin_read on public.invite_codes for select to authenticated
  using (private.is_admin_of(college_id));
revoke insert, update, delete on public.invite_codes from authenticated;

-- memberships: you see yourself; admins see and manage their college.
create policy memberships_read on public.memberships for select to authenticated
  using (user_id = (select auth.uid()) or private.is_admin_of(college_id));
create policy memberships_admin_update on public.memberships for update to authenticated
  using (private.is_admin_of(college_id)) with check (private.is_admin_of(college_id));
create policy memberships_delete on public.memberships for delete to authenticated
  using (user_id = (select auth.uid()) or private.is_admin_of(college_id));
revoke insert, update on public.memberships from authenticated;
grant update (role, display_name) on public.memberships to authenticated;

create policy platform_admins_self on public.platform_admins for select to authenticated
  using (user_id = (select auth.uid()));
revoke insert, update, delete on public.platform_admins from authenticated;

-- Fleet setup tables: members read, transport admins write.
create policy routes_read on public.routes for select to authenticated using (private.is_member(college_id));
create policy routes_admin_write on public.routes for all to authenticated
  using (private.is_admin_of(college_id)) with check (private.is_admin_of(college_id));

create policy stops_read on public.route_stops for select to authenticated using (private.is_member(college_id));
create policy stops_admin_write on public.route_stops for all to authenticated
  using (private.is_admin_of(college_id)) with check (private.is_admin_of(college_id));

create policy buses_read on public.buses for select to authenticated using (private.is_member(college_id));
create policy buses_admin_write on public.buses for all to authenticated
  using (private.is_admin_of(college_id)) with check (private.is_admin_of(college_id));

create policy templates_read on public.trip_templates for select to authenticated using (private.is_member(college_id));
create policy templates_admin_write on public.trip_templates for all to authenticated
  using (private.is_admin_of(college_id)) with check (private.is_admin_of(college_id));

create policy stop_times_read on public.template_stop_times for select to authenticated
  using (exists (select 1 from public.trip_templates t where t.id = template_id and private.is_member(t.college_id)));
create policy stop_times_admin_write on public.template_stop_times for all to authenticated
  using (exists (select 1 from public.trip_templates t where t.id = template_id and private.is_admin_of(t.college_id)))
  with check (exists (select 1 from public.trip_templates t where t.id = template_id and private.is_admin_of(t.college_id)));

-- trips: members read. Admins may cancel or reassign. Drivers change trips only through
-- start_trip / record_position / end_trip, which check driver_id = auth.uid().
create policy trips_read on public.trips for select to authenticated using (private.is_member(college_id));
create policy trips_admin_update on public.trips for update to authenticated
  using (private.is_admin_of(college_id)) with check (private.is_admin_of(college_id));
revoke insert, update, delete on public.trips from authenticated;
grant update (driver_id, status, bus_id) on public.trips to authenticated;

-- Location history is only for the transport office.
create policy breadcrumbs_admin_read on public.breadcrumbs for select to authenticated
  using (private.is_admin_of(college_id));
revoke insert, update, delete on public.breadcrumbs from authenticated;

create policy stop_events_read on public.stop_events for select to authenticated
  using (private.is_member(college_id));
revoke insert, update, delete on public.stop_events from authenticated;

create policy rider_prefs_own on public.rider_prefs for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and private.is_member(college_id));

create policy push_tokens_own on public.push_tokens for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy notification_log_own on public.notification_log for select to authenticated
  using (user_id = (select auth.uid()));
revoke insert, update, delete on public.notification_log from authenticated;

create policy usage_read on public.usage_daily for select to authenticated
  using (private.is_admin_of(college_id) or private.is_platform_admin());
revoke insert, update, delete on public.usage_daily from authenticated;

-- Realtime: private broadcast topics "trip:<id>" and "college:<id>", readable by that college's members.
-- Only SECURITY DEFINER database code sends; clients have no insert policy.
create policy realtime_members_receive on realtime.messages for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (
      (split_part((select realtime.topic()), ':', 1) = 'trip' and exists (
        select 1 from public.trips t
        where t.id::text = split_part((select realtime.topic()), ':', 2)
          and private.is_member(t.college_id)))
      or (split_part((select realtime.topic()), ':', 1) = 'college'
        and (select private.my_college())::text = split_part((select realtime.topic()), ':', 2))
    )
  );
