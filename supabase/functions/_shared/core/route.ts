import { clamp, haversineM, lerpLngLat, toLocalXY, type LngLat } from './geo.ts';

export type Route = {
  points: LngLat[];
  /** cumulative distance in metres at each point; cum[0] = 0 */
  cum: number[];
  length: number;
};

export type Projection = {
  /** distance along the route in metres */
  along: number;
  /** perpendicular distance from the route in metres */
  offset: number;
  segment: number;
  point: LngLat;
};

export function buildRoute(points: LngLat[]): Route {
  if (points.length < 2) throw new Error('A route needs at least two points');
  const cum = [0];
  for (let i = 1; i < points.length; i++) {
    cum.push(cum[i - 1] + haversineM(points[i - 1], points[i]));
  }
  return { points, cum, length: cum[cum.length - 1] };
}

function projectOnSegment(route: Route, i: number, p: LngLat): Projection {
  const a = route.points[i];
  const b = route.points[i + 1];
  const pa = toLocalXY(a, p);
  const ba = toLocalXY(a, b);
  const len2 = ba.x * ba.x + ba.y * ba.y;
  const t = len2 === 0 ? 0 : clamp((pa.x * ba.x + pa.y * ba.y) / len2, 0, 1);
  const dx = pa.x - ba.x * t;
  const dy = pa.y - ba.y * t;
  const segLen = route.cum[i + 1] - route.cum[i];
  return {
    along: route.cum[i] + segLen * t,
    offset: Math.sqrt(dx * dx + dy * dy),
    segment: i,
    point: lerpLngLat(a, b, t),
  };
}

export type ProjectWindow = { minAlong?: number; maxAlong?: number };

/**
 * Nearest point on the route, optionally restricted to a window of progress.
 * The window stops a bus on a route that doubles back from snapping to the
 * wrong (far-ahead or already-driven) leg of the same road.
 */
export function projectOnRoute(route: Route, p: LngLat, window: ProjectWindow = {}): Projection {
  const minAlong = window.minAlong ?? 0;
  const maxAlong = window.maxAlong ?? route.length;
  let best: Projection | null = null;
  for (let i = 0; i < route.points.length - 1; i++) {
    if (route.cum[i + 1] < minAlong || route.cum[i] > maxAlong) continue;
    let candidate = projectOnSegment(route, i, p);
    if (candidate.along < minAlong || candidate.along > maxAlong) {
      const clampedAlong = clamp(candidate.along, minAlong, maxAlong);
      const point = pointAtDistance(route, clampedAlong);
      candidate = { along: clampedAlong, offset: haversineM(point, p), segment: i, point };
    }
    if (!best || candidate.offset < best.offset) best = candidate;
  }
  return best ?? projectOnSegment(route, 0, p);
}

export function pointAtDistance(route: Route, along: number): LngLat {
  const d = clamp(along, 0, route.length);
  let lo = 0;
  let hi = route.cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (route.cum[mid] <= d) lo = mid;
    else hi = mid;
  }
  const segLen = route.cum[hi] - route.cum[lo];
  const t = segLen === 0 ? 0 : (d - route.cum[lo]) / segLen;
  return lerpLngLat(route.points[lo], route.points[hi], t);
}

/** The part of the route between two distances, for drawing "driven" vs "ahead". */
export function sliceRoute(route: Route, from: number, to: number): LngLat[] {
  const start = clamp(from, 0, route.length);
  const end = clamp(to, start, route.length);
  const out: LngLat[] = [pointAtDistance(route, start)];
  for (let i = 0; i < route.points.length; i++) {
    if (route.cum[i] > start && route.cum[i] < end) out.push(route.points[i]);
  }
  out.push(pointAtDistance(route, end));
  return out;
}

export function remainingDistance(currentAlong: number, targetAlong: number): number {
  return Math.max(0, targetAlong - currentAlong);
}

/** Distance along the route of each stop, by projecting stops onto the shape in order. */
export function stopDistances(route: Route, stops: LngLat[]): number[] {
  const out: number[] = [];
  let min = 0;
  for (const stop of stops) {
    const proj = projectOnRoute(route, stop, { minAlong: min });
    out.push(proj.along);
    min = proj.along;
  }
  return out;
}
