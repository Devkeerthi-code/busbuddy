import { TRIP_COLUMNS } from './rider-data';
import { supabase } from './supabase';
import type { Period, Role, TripRow } from './types';

export type Member = { user_id: string; display_name: string; role: Role; created_at: string };
export type InviteCode = { code: string; role: 'rider' | 'driver' };
export type Template = {
  id: string;
  route_id: string;
  bus_id: string;
  driver_id: string | null;
  period: Period;
  weekdays: number[];
  active: boolean;
  routes: { name: string } | null;
  buses: { number: string } | null;
};
export type UsageTotals = Record<string, { today: number; last30: number }>;

async function rows<T>(promise: PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> {
  const { data, error } = await promise;
  if (error) throw error;
  return (data ?? []) as T[];
}

export const fetchMembers = (collegeId: string) =>
  rows<Member>(
    supabase.from('memberships').select('user_id, display_name, role, created_at').eq('college_id', collegeId).order('display_name'),
  );

export const fetchInviteCodes = () => rows<InviteCode>(supabase.from('invite_codes').select('code, role'));

export const fetchTemplates = () =>
  rows<Template>(
    supabase
      .from('trip_templates')
      .select('id, route_id, bus_id, driver_id, period, weekdays, active, routes(name), buses(number)')
      .order('period'),
  );

export async function fetchRouteStopCounts(): Promise<Record<string, number>> {
  const data = await rows<{ route_id: string }>(supabase.from('route_stops').select('route_id'));
  const out: Record<string, number> = {};
  for (const r of data) out[r.route_id] = (out[r.route_id] ?? 0) + 1;
  return out;
}

export async function fetchHistory(days = 7): Promise<TripRow[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  return rows<TripRow>(
    supabase
      .from('trips')
      .select(TRIP_COLUMNS)
      .gte('service_date', since)
      .neq('status', 'scheduled')
      .order('service_date', { ascending: false })
      .order('started_at', { ascending: false })
      .limit(200),
  );
}

export async function fetchUsage(collegeId: string | null): Promise<UsageTotals> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  let query = supabase.from('usage_daily').select('metric, day, count').gte('day', since);
  if (collegeId) query = query.eq('college_id', collegeId);
  const data = await rows<{ metric: string; day: string; count: number }>(query);
  const totals: UsageTotals = {};
  for (const r of data) {
    const t = (totals[r.metric] ??= { today: 0, last30: 0 });
    t.last30 += r.count;
    if (r.day === today) t.today += r.count;
  }
  return totals;
}

export type StopTimeDraft = { stopId: string; name: string; time: string };

/** Suggests a timetable from distances: average city-bus speed plus a short dwell at each stop. */
export function suggestTimes(start: string, stops: { id: string; name: string; along: number }[], kmh = 22): StopTimeDraft[] {
  const [h, m] = start.split(':').map(Number);
  const startMin = h * 60 + m;
  const first = stops[0]?.along ?? 0;
  return stops.map((s, i) => {
    const minutes = Math.round(startMin + Math.abs(s.along - first) / ((kmh * 1000) / 60) + i * 0.5);
    const hh = String(Math.floor(minutes / 60) % 24).padStart(2, '0');
    const mm = String(minutes % 60).padStart(2, '0');
    return { stopId: s.id, name: s.name, time: `${hh}:${mm}` };
  });
}

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
