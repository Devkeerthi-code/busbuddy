export type LngLat = { lng: number; lat: number };

const EARTH_RADIUS_M = 6_371_008.8;
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineM(a: LngLat, b: LngLat): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Local flat projection in metres around an origin. Accurate to well under 1% for city-sized routes. */
export function toLocalXY(origin: LngLat, p: LngLat): { x: number; y: number } {
  const x = toRad(p.lng - origin.lng) * EARTH_RADIUS_M * Math.cos(toRad(origin.lat));
  const y = toRad(p.lat - origin.lat) * EARTH_RADIUS_M;
  return { x, y };
}

export function lerpLngLat(a: LngLat, b: LngLat, t: number): LngLat {
  return { lng: a.lng + (b.lng - a.lng) * t, lat: a.lat + (b.lat - a.lat) * t };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
