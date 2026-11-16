export const ARRIVAL_DEFAULTS = {
  enterRadiusM: 40,
  exitRadiusM: 80,
  /** consecutive fixes inside the enter radius needed to count an arrival */
  confirmFixes: 2,
  /** progress beyond a stop at which an un-visited stop is marked as passed */
  skipAfterM: 150,
};

export type StopRef = { seq: number; along: number };

export type ArrivalState = {
  /** stop the bus is currently standing at */
  atSeq: number | null;
  /** highest stop seq that has been arrived at or passed (-1 = none) */
  doneSeq: number;
  candidateSeq: number | null;
  candidateCount: number;
};

export type StopEvent =
  | { type: 'arrive'; seq: number; t: number }
  | { type: 'depart'; seq: number; t: number }
  | { type: 'skip'; seq: number; t: number };

export const initialArrivalState = (): ArrivalState => ({
  atSeq: null,
  doneSeq: -1,
  candidateSeq: null,
  candidateCount: 0,
});

/**
 * One step of stop detection with hysteresis.
 * `distances[i]` is the straight-line distance from the fix to stops[i].
 * Enter needs `confirmFixes` fixes within 40 m; leaving needs > 80 m, so a bus
 * idling near the edge of a stop doesn't flap between arrived and departed.
 */
export function stepArrival(
  state: ArrivalState,
  stops: StopRef[],
  distances: number[],
  progress: number,
  t: number,
  opts: Partial<typeof ARRIVAL_DEFAULTS> = {},
): { state: ArrivalState; events: StopEvent[]; completed: boolean } {
  const o = { ...ARRIVAL_DEFAULTS, ...opts };
  const events: StopEvent[] = [];
  let next: ArrivalState = { ...state };

  if (next.atSeq !== null) {
    const idx = stops.findIndex((s) => s.seq === next.atSeq);
    if (idx >= 0 && distances[idx] > o.exitRadiusM) {
      events.push({ type: 'depart', seq: next.atSeq, t });
      next.atSeq = null;
    }
  }

  if (next.atSeq === null) {
    const upcoming = stops
      .map((s, i) => ({ ...s, d: distances[i] }))
      .filter((s) => s.seq > next.doneSeq);
    const inside = upcoming.find((s) => s.d <= o.enterRadiusM);

    if (inside) {
      next.candidateCount = next.candidateSeq === inside.seq ? next.candidateCount + 1 : 1;
      next.candidateSeq = inside.seq;
      if (next.candidateCount >= o.confirmFixes) {
        for (const s of upcoming) {
          if (s.seq >= inside.seq) break;
          events.push({ type: 'skip', seq: s.seq, t });
        }
        events.push({ type: 'arrive', seq: inside.seq, t });
        next = { atSeq: inside.seq, doneSeq: inside.seq, candidateSeq: null, candidateCount: 0 };
      }
    } else {
      next.candidateSeq = null;
      next.candidateCount = 0;
      for (const s of upcoming) {
        if (progress > s.along + o.skipAfterM) {
          events.push({ type: 'skip', seq: s.seq, t });
          next.doneSeq = s.seq;
        }
      }
    }
  }

  const lastSeq = stops.length ? stops[stops.length - 1].seq : -1;
  return { state: next, events, completed: lastSeq >= 0 && next.doneSeq >= lastSeq };
}
