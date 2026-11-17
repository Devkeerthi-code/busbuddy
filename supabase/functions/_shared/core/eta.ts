import { clamp } from './geo.ts';

export const ETA_DEFAULTS = {
  ewmaAlpha: 0.3,
  minSpeedMps: 2,
  maxSpeedMps: 20,
  /** used before any movement has been seen (~25 km/h city bus) */
  fallbackSpeedMps: 7,
  dwellSeconds: 30,
  minHistoryTrips: 3,
  maxHistoryWeight: 0.7,
  /** below this distance live data fully wins over history */
  liveOnlyWithinM: 500,
};

/** Speed smoothing from progress along the route, so sideways GPS wobble never reads as movement. */
export function updateSpeed(
  previousEwma: number | null,
  deltaAlongM: number,
  deltaSeconds: number,
  alpha = ETA_DEFAULTS.ewmaAlpha,
): number | null {
  if (deltaSeconds <= 0) return previousEwma;
  const instant = Math.max(0, deltaAlongM) / deltaSeconds;
  if (previousEwma === null) return instant;
  return alpha * instant + (1 - alpha) * previousEwma;
}

export type EtaStop = { seq: number; along: number };

/** Historical average seconds to travel from stop `fromSeq` to the next stop, with the sample size. */
export type SegmentHistory = Map<number, { seconds: number; trips: number }>;

export type EtaInput = {
  progress: number;
  speedEwma: number | null;
  /** stops not yet arrived at / passed, in order */
  upcoming: EtaStop[];
  /** seq of the last stop reached, or -1 */
  doneSeq: number;
  /** along-route position of the last stop reached (0 before the first one) */
  doneAlong: number;
  history?: SegmentHistory;
};

export type StopEta = { seq: number; seconds: number };

function liveSeconds(distanceM: number, speedEwma: number | null): number {
  const o = ETA_DEFAULTS;
  const speed =
    speedEwma === null ? o.fallbackSpeedMps : clamp(speedEwma, o.minSpeedMps, o.maxSpeedMps);
  return distanceM / speed;
}

export function historyWeight(trips: number, remainingM: number): number {
  const o = ETA_DEFAULTS;
  if (trips < o.minHistoryTrips) return 0;
  const byCount = Math.min(o.maxHistoryWeight, trips / 10);
  const byDistance = clamp((remainingM - o.liveOnlyWithinM) / 2000, 0, 1);
  return byCount * byDistance;
}

/**
 * Seconds from now until the bus reaches each upcoming stop.
 * Live estimate: remaining distance / smoothed speed + dwell per stop in between.
 * Once a segment has history, the estimate for that segment blends towards the
 * historical average; the blend fades out as the bus gets close.
 */
export function estimateStopEtas(input: EtaInput): StopEta[] {
  const { progress, speedEwma, upcoming, history } = input;
  const out: StopEta[] = [];
  let elapsed = 0;
  let fromAlong = progress;
  let fromSeq = input.doneSeq;
  let fromStopAlong = input.doneAlong;

  upcoming.forEach((stop, index) => {
    // A stop already behind the bus (e.g. a trip picked up mid-route, before those stops are
    // marked passed) gets no ETA: it must not add distance or dwell, and must never trigger
    // an "about to arrive" alert for a bus that has already gone by.
    if (stop.along <= progress) {
      fromSeq = stop.seq;
      fromStopAlong = stop.along;
      return;
    }
    const distance = Math.max(0, stop.along - fromAlong);
    let seconds = liveSeconds(distance, speedEwma);

    const seg = history?.get(fromSeq);
    if (seg && seg.seconds > 0) {
      const segLength = Math.max(1, stop.along - fromStopAlong);
      const fractionLeft = clamp(distance / segLength, 0, 1);
      const historical = seg.seconds * fractionLeft;
      const w = historyWeight(seg.trips, stop.along - progress);
      seconds = w * historical + (1 - w) * seconds;
    }

    elapsed += seconds;
    out.push({ seq: stop.seq, seconds: Math.round(elapsed) });
    if (index < upcoming.length - 1) elapsed += ETA_DEFAULTS.dwellSeconds;
    fromAlong = stop.along;
    fromStopAlong = stop.along;
    fromSeq = stop.seq;
  });
  return out;
}

/** Positive = late. Seconds between predicted and scheduled arrival. */
export function delaySeconds(nowMs: number, etaSeconds: number, scheduledMs: number | null): number | null {
  if (scheduledMs === null) return null;
  return Math.round((nowMs + etaSeconds * 1000 - scheduledMs) / 1000);
}
