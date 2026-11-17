/**
 * Bus simulator: signs in as a DEMO driver and drives a demo route through the same
 * ingest-position API a real phone uses. Adds GPS noise, bad-accuracy fixes, one
 * teleport outlier, stop dwell and a signal drop (fixes queued, then sent as a batch).
 *
 *   npm run simulate -- --route A --period morning [--from 3] [--speed 1] [--no-drop] [--keep-schedule]
 *
 * By default the DEMO timetable is shifted so the starting stop is due right now, so the
 * board reads "On time" whenever you demo. --keep-schedule leaves the timetable alone.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { inTravelOrder, shapeInTravelOrder, type Period } from '../supabase/functions/_shared/core/direction';
import { buildRoute, pointAtDistance, stopDistances } from '../supabase/functions/_shared/core/route';
import { connect } from './lib/db';
import { publishableKey, supabaseUrl, userClient } from './lib/supabase-admin';

const FIX_EVERY_MS = 5000;
const CRUISE_MPS = 9;
const DWELL_MS = 30_000;
const DROP_MS = 60_000;

type Fix = { lat: number; lng: number; t: number; accuracy: number; speed: number | null };

const { values } = parseArgs({
  options: {
    route: { type: 'string', default: 'A' },
    period: { type: 'string', default: 'morning' },
    from: { type: 'string', default: '0' },
    speed: { type: 'string', default: '1' },
    'no-drop': { type: 'boolean', default: false },
    'keep-schedule': { type: 'boolean', default: false },
  },
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const metresToDeg = (m: number) => m / 111_195;

function demoLogin(key: 'driverA' | 'driverB') {
  const file = readFileSync(join(__dirname, '..', '.demo-accounts.local'), 'utf8');
  const line = file.split('\n').find((l) => l.startsWith(`${key}\t`));
  if (!line) throw new Error('Run "npm run db:seed" first to create the demo accounts.');
  const [, email, password] = line.split('\t');
  return { email, password };
}

/** Puts today's demo trip back to "scheduled" so the demo can be replayed any number of times. */
async function resetTrip(tripId: string, alignStopIndex: number | null) {
  const db = await connect();
  try {
    if (alignStopIndex !== null) {
      // Shift the whole timetable so the n-th stop (in travel order) is due now, in the college's time zone.
      await db.query(
        `with t as (
           select tr.template_id, c.timezone from public.trips tr
           join public.colleges c on c.id = tr.college_id and c.is_demo
           where tr.id = $1
         ), anchor as (
           select st.scheduled_time from public.template_stop_times st, t
           where st.template_id = t.template_id order by st.scheduled_time offset $2 limit 1
         )
         update public.template_stop_times st
         set scheduled_time = st.scheduled_time + (date_trunc('minute', (now() at time zone t.timezone))::time - anchor.scheduled_time)
         from t, anchor where st.template_id = t.template_id`,
        [tripId, alignStopIndex],
      );
    }
    await db.query('delete from public.stop_events where trip_id = $1', [tripId]);
    await db.query('delete from public.breadcrumbs where trip_id = $1', [tripId]);
    await db.query('delete from public.notification_log where trip_id = $1', [tripId]);
    await db.query(
      `update public.trips set status = 'scheduled', started_at = null, ended_at = null, end_reason = null,
         tracker = null, progress_m = 0, done_seq = -1, stop_etas = '[]', delay_s = null, last_fix_at = null
       where id = $1 and exists (select 1 from public.colleges c where c.id = college_id and c.is_demo)`, [tripId]);
  } finally {
    await db.end();
  }
}

async function main() {
  const routeLetter = values.route!.toUpperCase();
  const period = values.period as Period;
  const timeScale = Math.min(3, Math.max(1, Number(values.speed)));
  if (!['A', 'B'].includes(routeLetter) || !['morning', 'evening'].includes(period)) {
    throw new Error('Use --route A|B and --period morning|evening');
  }

  const client = userClient();
  const { error: signInError, data: auth } = await client.auth.signInWithPassword(
    demoLogin(routeLetter === 'A' ? 'driverA' : 'driverB'));
  if (signInError) throw signInError;

  await client.rpc('ensure_today_trips');
  const { data: trips, error } = await client
    .from('trips').select('id, status, routes!inner(name)')
    .eq('driver_id', auth.user.id).eq('period', period).like('routes.name', `Route ${routeLetter}%`);
  if (error) throw error;
  const trip = trips?.[0];
  if (!trip) throw new Error('No demo trip found for today. Run "npm run db:seed".');

  await resetTrip(trip.id, values['keep-schedule'] ? null : Number(values.from));
  const { error: startError } = await client.rpc('start_trip', { p_trip: trip.id });
  if (startError) throw startError;

  const { data: geo, error: geoError } = await client.rpc('route_geometry', {
    p_route: (await client.from('trips').select('route_id').eq('id', trip.id).single()).data!.route_id,
  });
  if (geoError) throw geoError;
  const shape = shapeInTravelOrder(
    (geo.shape as [number, number][]).map(([lng, lat]) => ({ lng, lat })), period);
  const route = buildRoute(shape);
  const stops = inTravelOrder(geo.stops as { seq: number; along: number; name: string; lng: number; lat: number }[], route.length, period);
  const stopAlong = stopDistances(route, stops);

  const fromIndex = Math.min(Number(values.from), stops.length - 2);
  let along = stopAlong[fromIndex];
  const dropAt = values['no-drop'] ? Infinity : stopAlong[fromIndex] + (route.length - stopAlong[fromIndex]) * 0.45;
  const ingestUrl = process.env.INGEST_URL ?? `${supabaseUrl()}/functions/v1/ingest-position`;
  console.log(`Driving ${geo.name} (${period}) from "${stops[fromIndex].name}", ${(route.length / 1000).toFixed(1)} km. Ctrl+C to stop.`);

  let queue: Fix[] = [];
  let dropUntil = 0;
  let dwellUntil = 0;
  let nextStop = fromIndex;
  let tick = 0;

  const send = async (fixes: Fix[]) => {
    const { data: session } = await client.auth.getSession();
    const res = await fetch(ingestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: publishableKey(),
        Authorization: `Bearer ${session.session!.access_token}`,
      },
      body: JSON.stringify({ tripId: trip.id, fixes }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`ingest failed ${res.status}: ${JSON.stringify(body)}`);
    return body as { status: string; accepted: number; rejected: number; nextStop: { name: string; seconds: number | null } | null; alertsSent: number };
  };

  while (true) {
    tick++;
    const now = Date.now();
    if (now >= dwellUntil) {
      along = Math.min(route.length, along + CRUISE_MPS * (FIX_EVERY_MS / 1000) * (0.85 + Math.random() * 0.3));
      if (nextStop < stops.length && along >= stopAlong[nextStop]) {
        along = stopAlong[nextStop];
        dwellUntil = now + DWELL_MS / timeScale;
        nextStop++;
      }
    }

    const p = pointAtDistance(route, along);
    const noise = () => metresToDeg((Math.random() - 0.5) * 12);
    let fix: Fix = { lat: p.lat + noise(), lng: p.lng + noise(), t: now, accuracy: 5 + Math.random() * 10, speed: CRUISE_MPS };
    if (tick % 37 === 0) fix = { ...fix, accuracy: 120 };
    if (tick % 53 === 0) fix = { ...fix, lat: fix.lat + metresToDeg(3000) };

    if (along >= dropAt && dropUntil === 0) {
      dropUntil = now + DROP_MS / timeScale;
      console.log('Signal dropped: queueing fixes for 60 s, like a phone in a dead zone.');
    }
    queue.push(fix);
    if (now >= dropUntil || dropUntil === 0) {
      const result = await send(queue);
      const eta = result.nextStop?.seconds == null ? '-' : `${Math.round(result.nextStop.seconds / 60)} min`;
      const next = result.nextStop ? `${result.nextStop.name} in ${eta}` : 'end';
      console.log(`sent ${queue.length} fix(es) -> accepted ${result.accepted}, rejected ${result.rejected}; next: ${next}${result.alertsSent ? `; ${result.alertsSent} alert(s) pushed` : ''}`);
      queue = [];
      if (result.status === 'completed') {
        console.log('Trip completed at the last stop.');
        break;
      }
    }
    await sleep(FIX_EVERY_MS / timeScale);
  }
  await client.auth.signOut();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
