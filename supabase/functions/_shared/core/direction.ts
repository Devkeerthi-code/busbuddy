import type { LngLat } from './geo.ts';

export type Period = 'morning' | 'evening';

/**
 * Mirrors public.ingest_context(): evening trips run the route backwards, so stops are
 * renumbered in the order the bus reaches them and measured from the campus end.
 */
export function inTravelOrder<T extends { seq: number; along: number }>(
  stops: T[],
  routeLength: number,
  period: Period,
): (T & { travelSeq: number; travelAlong: number })[] {
  const ordered = [...stops].sort((a, b) => (period === 'evening' ? b.seq - a.seq : a.seq - b.seq));
  return ordered.map((s, i) => ({
    ...s,
    travelSeq: i,
    travelAlong: period === 'evening' ? Math.max(0, routeLength - s.along) : s.along,
  }));
}

export function shapeInTravelOrder(shape: LngLat[], period: Period): LngLat[] {
  return period === 'evening' ? [...shape].reverse() : shape;
}
