import { stepArrival, initialArrivalState, type ArrivalState, type StopEvent } from './arrival.ts';
import { delaySeconds, estimateStopEtas, updateSpeed, type SegmentHistory, type StopEta } from './eta.ts';
import { haversineM, type LngLat } from './geo.ts';
import { checkFix, JITTER_DEFAULTS, type Fix } from './jitter.ts';
import { projectOnRoute, type Route } from './route.ts';

export const TRACKER_DEFAULTS = {
  backtrackToleranceM: 50,
  lookAheadM: 2000,
  offRouteM: 150,
  breadcrumbEveryMs: 30_000,
};

export type TrackerStop = LngLat & { seq: number; along: number; scheduledAt: number | null };

export type TrackerContext = {
  route: Route;
  stops: TrackerStop[];
  history?: SegmentHistory;
};

export type TrackerState = {
  lastFix: Fix | null;
  progress: number;
  speedEwma: number | null;
  arrival: ArrivalState;
  lastBreadcrumbAt: number | null;
};

export const initialTrackerState = (): TrackerState => ({
  lastFix: null,
  progress: 0,
  speedEwma: null,
  arrival: initialArrivalState(),
  lastBreadcrumbAt: null,
});

export type TrackerResult =
  | { accepted: false; reason: string; state: TrackerState }
  | {
      accepted: true;
      state: TrackerState;
      offRoute: boolean;
      events: StopEvent[];
      completed: boolean;
      etas: StopEta[];
      /** delay at the next upcoming stop, seconds, positive = late */
      delaySec: number | null;
      storeBreadcrumb: boolean;
    };

function searchWindow(state: TrackerState, fix: Fix, route: Route) {
  if (!state.lastFix) return { minAlong: 0, maxAlong: route.length };
  const seconds = (fix.t - state.lastFix.t) / 1000;
  const reach = Math.max(TRACKER_DEFAULTS.lookAheadM, JITTER_DEFAULTS.maxSpeedMps * seconds);
  return {
    minAlong: Math.max(0, state.progress - TRACKER_DEFAULTS.backtrackToleranceM),
    maxAlong: Math.min(route.length, state.progress + reach),
  };
}

export function processFix(state: TrackerState, fix: Fix, ctx: TrackerContext): TrackerResult {
  const verdict = checkFix(fix, state.lastFix);
  if (!verdict.ok) return { accepted: false, reason: verdict.reason, state };

  const projection = projectOnRoute(ctx.route, fix, searchWindow(state, fix, ctx.route));
  // Progress never goes backwards: small negative moves are GPS noise, not a reversing bus.
  const progress = Math.max(state.progress, projection.along);
  const speedEwma = state.lastFix
    ? updateSpeed(state.speedEwma, progress - state.progress, (fix.t - state.lastFix.t) / 1000)
    : state.speedEwma;

  const distances = ctx.stops.map((s) => haversineM(s, fix));
  const arrival = stepArrival(state.arrival, ctx.stops, distances, progress, fix.t);

  const doneSeq = arrival.state.doneSeq;
  const upcoming = ctx.stops.filter((s) => s.seq > doneSeq);
  const doneStop = ctx.stops.find((s) => s.seq === doneSeq);
  const etas = estimateStopEtas({
    progress,
    speedEwma,
    upcoming,
    doneSeq,
    doneAlong: doneStop?.along ?? 0,
    history: ctx.history,
  });

  const next = upcoming[0];
  const delaySec = next && etas[0] ? delaySeconds(fix.t, etas[0].seconds, next.scheduledAt) : null;
  const storeBreadcrumb =
    state.lastBreadcrumbAt === null || fix.t - state.lastBreadcrumbAt >= TRACKER_DEFAULTS.breadcrumbEveryMs;

  return {
    accepted: true,
    state: {
      lastFix: fix,
      progress,
      speedEwma,
      arrival: arrival.state,
      lastBreadcrumbAt: storeBreadcrumb ? fix.t : state.lastBreadcrumbAt,
    },
    offRoute: projection.offset > TRACKER_DEFAULTS.offRouteM,
    events: arrival.events,
    completed: arrival.completed,
    etas,
    delaySec,
    storeBreadcrumb,
  };
}
