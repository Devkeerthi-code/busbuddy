import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import type { Bus, Period, RouteGeometry, RouteRow, TripRow } from './types';

export type RiderPrefs = { routeId: string; stopId: string; period: Period; alerts: boolean };

const PREFS_KEY = 'busbuddy.rider-prefs';

/** Local copy first so the answer screen opens instantly, even offline; the database copy drives alerts. */
export async function loadLocalPrefs(): Promise<RiderPrefs | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    return raw ? (JSON.parse(raw) as RiderPrefs) : null;
  } catch {
    return null;
  }
}

export async function loadRemotePrefs(userId: string): Promise<RiderPrefs | null> {
  const { data } = await supabase
    .from('rider_prefs')
    .select('route_id, stop_id, period, alerts')
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) return null;
  const prefs = { routeId: data.route_id, stopId: data.stop_id, period: data.period, alerts: data.alerts } as RiderPrefs;
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs)).catch(() => undefined);
  return prefs;
}

export async function savePrefs(userId: string, collegeId: string, prefs: RiderPrefs): Promise<void> {
  const { error } = await supabase.from('rider_prefs').upsert({
    user_id: userId,
    college_id: collegeId,
    route_id: prefs.routeId,
    stop_id: prefs.stopId,
    period: prefs.period,
    alerts: prefs.alerts,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs)).catch(() => undefined);
}

export async function clearLocalPrefs(): Promise<void> {
  await AsyncStorage.removeItem(PREFS_KEY).catch(() => undefined);
}

export async function fetchRoutes(): Promise<RouteRow[]> {
  const { data, error } = await supabase.from('routes').select('id, name, shape_source').order('name');
  if (error) throw error;
  return data ?? [];
}

const geometryCache = new Map<string, RouteGeometry>();

export async function fetchRouteGeometry(routeId: string, fresh = false): Promise<RouteGeometry | null> {
  if (!fresh && geometryCache.has(routeId)) return geometryCache.get(routeId)!;
  const { data, error } = await supabase.rpc('route_geometry', { p_route: routeId });
  if (error) throw error;
  if (data) geometryCache.set(routeId, data as RouteGeometry);
  return (data as RouteGeometry | null) ?? null;
}

export const TRIP_COLUMNS =
  'id, route_id, bus_id, driver_id, template_id, period, service_date, status, started_at, ended_at, end_reason, last_lng, last_lat, last_fix_at, progress_m, speed_mps, delay_s, done_seq, stop_etas, off_route, buses(number, capacity), routes(name)';

/** Today's trips (materialised from the weekly plan on first call of the day). */
export async function fetchTodayTrips(filter: { routeId?: string; period?: Period } = {}): Promise<TripRow[]> {
  await supabase.rpc('ensure_today_trips');
  const today = await todayInCollege();
  let query = supabase.from('trips').select(TRIP_COLUMNS).eq('service_date', today).order('period');
  if (filter.routeId) query = query.eq('route_id', filter.routeId);
  if (filter.period) query = query.eq('period', filter.period);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as TripRow[];
}

/** Scheduled time per stop for a set of templates: { templateId: { stopId: "07:05:00" } } */
export async function fetchStopTimes(templateIds: string[]): Promise<Record<string, Record<string, string>>> {
  if (templateIds.length === 0) return {};
  const { data, error } = await supabase
    .from('template_stop_times')
    .select('template_id, stop_id, scheduled_time')
    .in('template_id', templateIds);
  if (error) throw error;
  const out: Record<string, Record<string, string>> = {};
  for (const row of data ?? []) {
    (out[row.template_id] ??= {})[row.stop_id] = row.scheduled_time;
  }
  return out;
}

export async function fetchDepartures(tripId: string): Promise<Record<number, string | null>> {
  const { data } = await supabase.from('stop_events').select('stop_seq, departed_at, arrived_at').eq('trip_id', tripId);
  const out: Record<number, string | null> = {};
  for (const row of data ?? []) out[row.stop_seq] = row.departed_at ?? row.arrived_at;
  return out;
}

export async function fetchBuses(): Promise<Bus[]> {
  const { data, error } = await supabase.from('buses').select('id, number, capacity').order('number');
  if (error) throw error;
  return data ?? [];
}

let cachedToday: { value: string; at: number } | null = null;

/** The college's calendar date (colleges keep their own time zone; phones may be set wrong). */
async function todayInCollege(): Promise<string> {
  if (cachedToday && Date.now() - cachedToday.at < 60_000) return cachedToday.value;
  const { data } = await supabase.from('memberships').select('colleges(timezone)').maybeSingle();
  const tz = (data?.colleges as { timezone?: string } | null)?.timezone ?? 'Asia/Kolkata';
  const value = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  cachedToday = { value, at: Date.now() };
  return value;
}

export function track(metric: 'rider_opened_live' | 'rider_set_stop') {
  supabase.rpc('track_event', { p_metric: metric }).then(
    () => undefined,
    () => undefined,
  );
}
