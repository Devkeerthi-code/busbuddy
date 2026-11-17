import type { Period } from '@core/direction.ts';

export type { Period };
export type Role = 'rider' | 'driver' | 'transport_admin';
export type TripStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';

export type Membership = {
  college_id: string;
  role: Role;
  display_name: string;
  colleges: { name: string; campus_name: string; is_demo: boolean; timezone: string };
};

export type RouteRow = { id: string; name: string; shape_source: 'stops' | 'trip' | 'survey' };

export type StopGeo = { id: string; seq: number; name: string; along: number; lng: number; lat: number };

export type RouteGeometry = {
  routeId: string;
  name: string;
  shape: [number, number][] | null;
  stops: StopGeo[];
};

export type Bus = { id: string; number: string; capacity: number };

export type StopEta = { seq: number; stopId: string; seconds: number };

export type TripRow = {
  id: string;
  route_id: string;
  bus_id: string;
  driver_id: string | null;
  template_id: string;
  period: Period;
  service_date: string;
  status: TripStatus;
  started_at: string | null;
  ended_at: string | null;
  end_reason: string | null;
  last_lng: number | null;
  last_lat: number | null;
  last_fix_at: string | null;
  progress_m: number;
  speed_mps: number | null;
  delay_s: number | null;
  done_seq: number;
  stop_etas: StopEta[];
  off_route: boolean;
  buses: { number: string; capacity: number } | null;
  routes: { name: string } | null;
};

/** Payload of the "position" broadcast on trip:<id> and college:<id>. */
export type LivePosition = {
  tripId: string;
  lng: number;
  lat: number;
  t: number;
  progress: number;
  speed: number | null;
  delaySec: number | null;
  doneSeq: number;
  etas: StopEta[];
  offRoute: boolean;
};
