-- BusBuddy core schema: colleges, people, routes, buses, trips and tracking data.
create extension if not exists postgis with schema extensions;
create schema if not exists private;

create type public.member_role as enum ('rider', 'driver', 'transport_admin');
create type public.trip_period as enum ('morning', 'evening');
create type public.trip_status as enum ('scheduled', 'active', 'completed', 'cancelled');

create table public.colleges (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 3 and 80),
  campus_name text not null check (char_length(btrim(campus_name)) between 2 and 60),
  timezone text not null default 'Asia/Kolkata',
  is_demo boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- One code per (college, role); codes are unique across every college.
create table public.invite_codes (
  code text primary key check (code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$'),
  college_id uuid not null references public.colleges (id) on delete cascade,
  role public.member_role not null check (role in ('rider', 'driver')),
  created_at timestamptz not null default now(),
  unique (college_id, role)
);

-- A person belongs to exactly one college; that keeps every screen unambiguous.
create table public.memberships (
  user_id uuid primary key references auth.users (id) on delete cascade,
  college_id uuid not null references public.colleges (id) on delete cascade,
  role public.member_role not null,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 60),
  created_at timestamptz not null default now()
);
create index memberships_college_role_idx on public.memberships (college_id, role);

create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create table public.routes (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  shape extensions.geography(LineString, 4326),
  shape_source text not null default 'stops' check (shape_source in ('stops', 'trip', 'survey')),
  created_at timestamptz not null default now(),
  unique (college_id, name),
  unique (id, college_id)
);

create table public.route_stops (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null,
  college_id uuid not null,
  seq integer not null check (seq >= 0),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  location extensions.geography(Point, 4326) not null,
  dist_along_m double precision not null default 0 check (dist_along_m >= 0),
  foreign key (route_id, college_id) references public.routes (id, college_id) on delete cascade,
  unique (route_id, seq) deferrable initially deferred,
  unique (id, route_id)
);
create index route_stops_location_idx on public.route_stops using gist (location);

create table public.buses (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges (id) on delete cascade,
  number text not null check (char_length(btrim(number)) between 1 and 12),
  capacity integer not null check (capacity between 1 and 120),
  created_at timestamptz not null default now(),
  unique (college_id, number),
  unique (id, college_id)
);

create table public.trip_templates (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null,
  route_id uuid not null,
  bus_id uuid not null,
  driver_id uuid references auth.users (id) on delete set null,
  period public.trip_period not null,
  weekdays smallint[] not null default '{1,2,3,4,5,6}'
    check (cardinality(weekdays) > 0 and weekdays <@ '{0,1,2,3,4,5,6}'::smallint[]),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  foreign key (route_id, college_id) references public.routes (id, college_id) on delete cascade,
  foreign key (bus_id, college_id) references public.buses (id, college_id) on delete cascade,
  unique (route_id, bus_id, period),
  unique (id, college_id)
);
create index trip_templates_college_idx on public.trip_templates (college_id);

create table public.template_stop_times (
  template_id uuid not null references public.trip_templates (id) on delete cascade,
  stop_id uuid not null references public.route_stops (id) on delete cascade,
  scheduled_time time not null,
  primary key (template_id, stop_id)
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null,
  template_id uuid not null,
  route_id uuid not null,
  bus_id uuid not null,
  driver_id uuid references auth.users (id) on delete set null,
  period public.trip_period not null,
  service_date date not null,
  status public.trip_status not null default 'scheduled',
  started_at timestamptz,
  ended_at timestamptz,
  end_reason text check (end_reason in ('last_stop', 'driver', 'no_signal', 'admin')),
  -- live state, written only by record_position()
  last_lng double precision,
  last_lat double precision,
  last_fix_at timestamptz,
  progress_m double precision not null default 0,
  speed_mps double precision,
  off_route boolean not null default false,
  delay_s integer,
  done_seq integer not null default -1,
  stop_etas jsonb not null default '[]'::jsonb,
  tracker jsonb,
  foreign key (template_id, college_id) references public.trip_templates (id, college_id) on delete cascade,
  foreign key (route_id, college_id) references public.routes (id, college_id) on delete cascade,
  foreign key (bus_id, college_id) references public.buses (id, college_id) on delete cascade,
  unique (template_id, service_date),
  check (status <> 'active' or started_at is not null)
);
create index trips_college_date_idx on public.trips (college_id, service_date);
create index trips_driver_date_idx on public.trips (driver_id, service_date);
create unique index trips_one_active_per_driver on public.trips (driver_id) where status = 'active';

create table public.breadcrumbs (
  id bigint generated always as identity primary key,
  trip_id uuid not null references public.trips (id) on delete cascade,
  college_id uuid not null references public.colleges (id) on delete cascade,
  recorded_at timestamptz not null,
  location extensions.geography(Point, 4326) not null,
  accuracy_m real,
  speed_mps real,
  progress_m double precision
);
create index breadcrumbs_trip_time_idx on public.breadcrumbs (trip_id, recorded_at);
create index breadcrumbs_time_idx on public.breadcrumbs (recorded_at);

create table public.stop_events (
  trip_id uuid not null references public.trips (id) on delete cascade,
  college_id uuid not null references public.colleges (id) on delete cascade,
  stop_seq integer not null,
  stop_id uuid references public.route_stops (id) on delete set null,
  arrived_at timestamptz,
  departed_at timestamptz,
  skipped boolean not null default false,
  primary key (trip_id, stop_seq)
);

create table public.rider_prefs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  college_id uuid not null references public.colleges (id) on delete cascade,
  route_id uuid not null,
  stop_id uuid not null,
  period public.trip_period not null,
  alerts boolean not null default true,
  updated_at timestamptz not null default now(),
  foreign key (route_id, college_id) references public.routes (id, college_id) on delete cascade,
  foreign key (stop_id, route_id) references public.route_stops (id, route_id) on delete cascade
);
create index rider_prefs_alerts_idx on public.rider_prefs (route_id, period) where alerts;

create table public.push_tokens (
  token text primary key check (token ~ '^Expo(nent)?PushToken\[.+\]$'),
  user_id uuid not null references auth.users (id) on delete cascade,
  updated_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);

-- The primary key IS the de-duplication rule: one alert per kind, per student, per trip.
create table public.notification_log (
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('eta5')),
  stop_id uuid,
  sent_at timestamptz not null default now(),
  primary key (trip_id, user_id, kind)
);

-- Counts only. No user ids, no locations.
create table public.usage_daily (
  college_id uuid references public.colleges (id) on delete cascade,
  metric text not null check (metric in (
    'college_created', 'member_joined', 'trip_started', 'trip_completed',
    'rider_opened_live', 'alert_sent', 'rider_set_stop'
  )),
  day date not null default current_date,
  count integer not null default 0 check (count >= 0),
  unique nulls not distinct (college_id, metric, day)
);

create table private.join_attempts (
  user_id uuid not null,
  attempted_at timestamptz not null default now()
);
create index join_attempts_user_time_idx on private.join_attempts (user_id, attempted_at);
