import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { haversineM } from '@core/geo.ts';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabase } from './supabase';

/**
 * Background location for drivers. Lives at module scope because Android can start the JS
 * runtime for this task with no screen mounted. Location is collected ONLY between
 * startTripTracking() and stopTripTracking().
 */
export const TRIP_TASK = 'busbuddy-trip-location';

const KEYS = { trip: 'busbuddy.active-trip', queue: 'busbuddy.fix-queue', status: 'busbuddy.trip-status', lastSent: 'busbuddy.last-sent' };
const MAX_QUEUE = 300;
const BATCH = 50;
/** send right away after this much movement… */
const SEND_AFTER_M = 15;
/** …otherwise at least this often, so a bus waiting at a stop still looks live */
const HEARTBEAT_MS = 20_000;

export type QueuedFix = { lat: number; lng: number; t: number; accuracy: number; speed: number | null };
export type TripStatusSnapshot = {
  at: number;
  ok: boolean;
  status?: 'active' | 'completed';
  nextStop?: { name: string; seconds: number | null } | null;
  queued: number;
  error?: string;
};

type ActiveTrip = { tripId: string; busNumber: string };

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function enqueue(fixes: QueuedFix[]) {
  const queue = await readJson<QueuedFix[]>(KEYS.queue, []);
  // Keep the newest fixes if a long dead zone overflows the queue.
  await AsyncStorage.setItem(KEYS.queue, JSON.stringify([...queue, ...fixes].slice(-MAX_QUEUE)));
}

async function shouldSend(latest: QueuedFix): Promise<boolean> {
  const last = await readJson<QueuedFix | null>(KEYS.lastSent, null);
  if (!last) return true;
  return latest.t - last.t >= HEARTBEAT_MS || haversineM(last, latest) >= SEND_AFTER_M;
}

/** Upload queued fixes in order. Keeps them on failure so nothing is lost in a dead zone. */
export async function flushQueue(): Promise<TripStatusSnapshot | null> {
  const trip = await readJson<ActiveTrip | null>(KEYS.trip, null);
  if (!trip) return null;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  let queue = await readJson<QueuedFix[]>(KEYS.queue, []);
  let snapshot: TripStatusSnapshot = { at: Date.now(), ok: false, queued: queue.length };
  if (!token) {
    snapshot.error = 'signed_out';
  }

  while (token && queue.length > 0) {
    const batch = queue.slice(0, BATCH);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ingest-position`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tripId: trip.tripId, fixes: batch }),
      });
      const body = (await res.json().catch(() => ({}))) as Partial<TripStatusSnapshot> & { error?: string };
      if (res.status === 403 || res.status === 409) {
        // Trip ended elsewhere (admin, timeout) or isn't trackable: stop sharing immediately.
        await stopTripTracking();
        snapshot = { at: Date.now(), ok: false, status: 'completed', queued: 0, error: body.error };
        break;
      }
      if (!res.ok) throw new Error(body.error ?? `http_${res.status}`);
      queue = queue.slice(batch.length);
      await AsyncStorage.setItem(KEYS.queue, JSON.stringify(queue));
      await AsyncStorage.setItem(KEYS.lastSent, JSON.stringify(batch[batch.length - 1]));
      snapshot = { at: Date.now(), ok: true, status: body.status, nextStop: body.nextStop ?? null, queued: queue.length };
      if (body.status === 'completed') {
        await stopTripTracking();
        break;
      }
    } catch (error) {
      snapshot = { ...snapshot, at: Date.now(), ok: false, queued: queue.length, error: error instanceof Error ? error.message : 'offline' };
      break;
    }
  }
  await AsyncStorage.setItem(KEYS.status, JSON.stringify(snapshot));
  return snapshot;
}

if (Platform.OS !== 'web') {
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TRIP_TASK, async ({ data, error }) => {
    if (error || !data?.locations?.length) return;
    const fixes: QueuedFix[] = data.locations.map((l) => ({
      lat: l.coords.latitude,
      lng: l.coords.longitude,
      t: l.timestamp,
      accuracy: l.coords.accuracy ?? 999,
      speed: l.coords.speed,
    }));
    await enqueue(fixes);
    if (await shouldSend(fixes[fixes.length - 1])) await flushQueue();
  });
}

export type PermissionProblem = 'foreground' | 'background' | 'services_off' | null;

export async function ensureDriverPermissions(): Promise<PermissionProblem> {
  if (!(await Location.hasServicesEnabledAsync())) return 'services_off';
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return 'foreground';
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== 'granted') return 'background';
  return null;
}

export async function startTripTracking(trip: ActiveTrip): Promise<void> {
  await AsyncStorage.multiSet([
    [KEYS.trip, JSON.stringify(trip)],
    [KEYS.queue, '[]'],
    [KEYS.status, JSON.stringify({ at: Date.now(), ok: true, status: 'active', queued: 0 })],
  ]);
  await AsyncStorage.removeItem(KEYS.lastSent);
  await Location.startLocationUpdatesAsync(TRIP_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 5000,
    // Movement filtering happens in the task (send after 15 m or every 20 s), so a bus
    // standing at a stop still reports in instead of looking like a lost signal.
    distanceInterval: 0,
    deferredUpdatesInterval: 5000,
    pausesUpdatesAutomatically: false,
    activityType: Location.ActivityType.AutomotiveNavigation,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: `BusBuddy · Sharing Bus ${trip.busNumber} location`,
      notificationBody: 'Students can see the bus. This stops when the trip ends.',
      notificationColor: '#FFB400',
      killServiceOnDestroy: false,
    },
  });
}

export async function stopTripTracking(): Promise<void> {
  if (Platform.OS !== 'web' && (await TaskManager.isTaskRegisteredAsync(TRIP_TASK))) {
    await Location.stopLocationUpdatesAsync(TRIP_TASK).catch(() => undefined);
  }
  await AsyncStorage.multiRemove([KEYS.trip, KEYS.queue, KEYS.lastSent]);
}

export async function activeTrip(): Promise<ActiveTrip | null> {
  return readJson<ActiveTrip | null>(KEYS.trip, null);
}

export async function lastStatus(): Promise<TripStatusSnapshot | null> {
  return readJson<TripStatusSnapshot | null>(KEYS.status, null);
}
