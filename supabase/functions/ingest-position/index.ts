// Receives GPS fixes from a driver's phone, runs the shared tracking core and stores the result.
// Writes use the driver's own JWT, so the database decides whether this driver may publish.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@4';
import { alertMessage, stopsDueForAlert } from '../_shared/core/alerts.ts';
import type { SegmentHistory } from '../_shared/core/eta.ts';
import { buildRoute } from '../_shared/core/route.ts';
import type { StopEvent } from '../_shared/core/arrival.ts';
import { initialTrackerState, processFix, type TrackerContext, type TrackerState } from '../_shared/core/tracker.ts';

const MAX_FUTURE_MS = 60_000;

const FixSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  t: z.number().int().positive(),
  accuracy: z.number().nonnegative().max(10_000),
  speed: z.number().nullable().optional(),
});

const BodySchema = z.object({
  tripId: z.uuid(),
  fixes: z.array(FixSchema).min(1).max(50),
});

const ContextSchema = z.object({
  trip: z.object({
    id: z.string(),
    collegeId: z.string(),
    busNumber: z.string(),
    tracker: z.unknown().nullable(),
  }),
  shape: z.array(z.tuple([z.number(), z.number()])).nullable(),
  stops: z.array(z.object({
    id: z.string(), seq: z.number(), name: z.string(),
    lng: z.number(), lat: z.number(), along: z.number(),
    scheduledAt: z.number().nullable(),
  })),
  history: z.array(z.object({ fromSeq: z.number(), seconds: z.number(), trips: z.number() })),
});

type Context = z.infer<typeof ContextSchema>;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function firstKey(envName: string): string {
  const keys = JSON.parse(Deno.env.get(envName) ?? '{}') as Record<string, string>;
  const key = keys.default ?? Object.values(keys)[0];
  if (!key) throw new Error(`${envName} is not available`);
  return key;
}

function trackerContext(ctx: Context): TrackerContext {
  const history: SegmentHistory = new Map(ctx.history.map((h) => [h.fromSeq, { seconds: h.seconds, trips: h.trips }]));
  return {
    route: buildRoute(ctx.shape!.map(([lng, lat]) => ({ lng, lat }))),
    stops: ctx.stops.map((s) => ({ seq: s.seq, along: s.along, lng: s.lng, lat: s.lat, scheduledAt: s.scheduledAt })),
    history,
  };
}

function restoreState(raw: unknown): TrackerState {
  if (raw && typeof raw === 'object' && 'arrival' in raw) return raw as TrackerState;
  return initialTrackerState();
}

type EtaOut = { seq: number; stopId: string; seconds: number };

async function sendArrivalAlerts(admin: SupabaseClient, tripId: string, etas: EtaOut[]) {
  const dueSeqs = new Set(stopsDueForAlert(etas));
  const due = etas.filter((e) => dueSeqs.has(e.seq));
  if (due.length === 0) return 0;
  const { data, error } = await admin.rpc('claim_arrival_alerts', { p_trip: tripId, p_stop_ids: due.map((e) => e.stopId) });
  if (error) throw error;
  const rows = (data ?? []) as { token: string; stop_id: string; stop_name: string; bus_number: string }[];
  if (rows.length === 0) return 0;

  const secondsByStop = new Map(due.map((e) => [e.stopId, e.seconds]));
  const messages = rows.map((r) => {
    const { title, body } = alertMessage(r.bus_number, r.stop_name, secondsByStop.get(r.stop_id) ?? 300);
    return { to: r.token, title, body, sound: 'default', channelId: 'arrivals', data: { tripId } };
  });

  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
  const expoToken = Deno.env.get('EXPO_ACCESS_TOKEN');
  if (expoToken) headers.Authorization = `Bearer ${expoToken}`;
  const res = await fetch('https://exp.host/--/api/v2/push/send', { method: 'POST', headers, body: JSON.stringify(messages) });
  if (!res.ok) console.error('expo push failed', res.status, await res.text());
  return messages.length;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json(401, { error: 'not_signed_in' });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json(400, { error: 'invalid_body', issues: parsed.error.issues.slice(0, 5) });
  const { tripId } = parsed.data;
  const now = Date.now();
  const fixes = parsed.data.fixes.filter((f) => f.t <= now + MAX_FUTURE_MS).sort((a, b) => a.t - b.t);

  const url = Deno.env.get('SUPABASE_URL')!;
  const asDriver = createClient(url, firstKey('SUPABASE_PUBLISHABLE_KEYS'), {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const ctxRes = await asDriver.rpc('ingest_context', { p_trip: tripId });
  if (ctxRes.error) {
    if (ctxRes.error.message.includes('not_your_active_trip')) return json(403, { error: 'not_your_active_trip' });
    if (/jwt|token/i.test(ctxRes.error.message)) return json(401, { error: 'not_signed_in' });
    return json(500, { error: 'context_failed' });
  }
  const ctx = ContextSchema.safeParse(ctxRes.data);
  if (!ctx.success || !ctx.data.shape || ctx.data.shape.length < 2) return json(409, { error: 'route_not_ready' });

  const tctx = trackerContext(ctx.data);
  let state = restoreState(ctx.data.trip.tracker);
  let accepted = 0;
  let completed = false;
  const stopIdBySeq = new Map(ctx.data.stops.map((s) => [s.seq, s.id]));
  const withStopIds = <T extends { seq: number }>(items: T[]) =>
    items.map((item) => ({ ...item, stopId: stopIdBySeq.get(item.seq)! }));
  let latestEtas: EtaOut[] = [];
  let pendingEvents: StopEvent[] = [];

  for (const [index, fix] of fixes.entries()) {
    const result = processFix(state, fix, tctx);
    if (!result.accepted) continue;
    accepted++;
    state = result.state;
    latestEtas = withStopIds(result.etas);
    completed = result.completed;
    pendingEvents = pendingEvents.concat(result.events);

    const isLast = index === fixes.length - 1 || completed;
    if (!result.storeBreadcrumb && pendingEvents.length === 0 && !isLast) continue;

    const { error } = await asDriver.rpc('record_position', {
      p_trip: tripId,
      p: {
        lng: fix.lng, lat: fix.lat, t: fix.t, accuracy: fix.accuracy,
        speed: state.speedEwma, progress: state.progress, offRoute: result.offRoute,
        delaySec: result.delaySec, doneSeq: state.arrival.doneSeq, etas: latestEtas,
        events: withStopIds(pendingEvents), breadcrumb: result.storeBreadcrumb, completed, tracker: state,
      },
    });
    if (error) return json(500, { error: 'record_failed' });
    pendingEvents = [];
    if (completed) break;
  }

  let alertsSent = 0;
  if (accepted > 0 && !completed) {
    try {
      const admin = createClient(url, firstKey('SUPABASE_SECRET_KEYS'), { auth: { persistSession: false } });
      alertsSent = await sendArrivalAlerts(admin, tripId, latestEtas);
    } catch (error) {
      // Alerts are best-effort: a push outage must never stop location updates.
      console.error('alerts failed', error);
    }
  }

  const next = ctx.data.stops.find((s) => s.seq > state.arrival.doneSeq);
  return json(200, {
    accepted,
    rejected: fixes.length - accepted,
    status: completed ? 'completed' : 'active',
    nextStop: next
      ? { seq: next.seq, name: next.name, seconds: accepted > 0 ? latestEtas.find((e) => e.seq === next.seq)?.seconds ?? null : null }
      : null,
    alertsSent,
  });
});
