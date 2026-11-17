import type { StopEta, TripStatus } from './types';

/** What the board says about one bus and one rider's stop. Pure, so it is unit-tested. */
export type Answer =
  | { kind: 'not_started'; departsAt: string | null }
  | { kind: 'on_the_way'; seconds: number; arriving: boolean }
  | { kind: 'at_stop' }
  | { kind: 'left'; at: string | null }
  | { kind: 'completed' }
  | { kind: 'cancelled' };

export const ARRIVING_SECONDS = 5 * 60;

type Input = {
  status: TripStatus;
  /** travel-order position of the rider's stop */
  myTravelSeq: number;
  /** last stop the bus reached or passed, in travel order (-1 = none) */
  doneSeq: number;
  etas: StopEta[];
  /** when the last position was recorded (ms); ETAs count down from here */
  fixAt: number | null;
  now: number;
  firstStopTime: string | null;
  departedMyStopAt: string | null;
  atMyStop: boolean;
};

export function answerFor(i: Input): Answer {
  if (i.status === 'cancelled') return { kind: 'cancelled' };
  if (i.status === 'scheduled') return { kind: 'not_started', departsAt: i.firstStopTime };
  if (i.status === 'completed' && i.doneSeq < i.myTravelSeq) return { kind: 'completed' };
  if (i.atMyStop) return { kind: 'at_stop' };
  if (i.doneSeq >= i.myTravelSeq) return { kind: 'left', at: i.departedMyStopAt };
  if (i.status === 'completed') return { kind: 'completed' };

  const eta = i.etas.find((e) => e.seq === i.myTravelSeq);
  if (!eta) return { kind: 'on_the_way', seconds: Number.NaN, arriving: false };
  const elapsed = i.fixAt === null ? 0 : Math.max(0, (i.now - i.fixAt) / 1000);
  const seconds = Math.max(0, eta.seconds - elapsed);
  return { kind: 'on_the_way', seconds, arriving: seconds <= ARRIVING_SECONDS };
}

/** After this long without a fix the board dims and says the number is an estimate. */
export const STALE_AFTER_MS = 30_000;

export function isStale(fixAt: number | null, now: number): boolean {
  return fixAt !== null && now - fixAt > STALE_AFTER_MS;
}
