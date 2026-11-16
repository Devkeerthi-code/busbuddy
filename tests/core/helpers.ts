import type { LngLat } from '@core/geo.ts';

export const ORIGIN: LngLat = { lng: 80.2, lat: 12.9 };
const M_PER_DEG_LAT = 111_195;

/** A point `east` / `north` metres from ORIGIN. */
export function at(east: number, north: number): LngLat {
  return {
    lat: ORIGIN.lat + north / M_PER_DEG_LAT,
    lng: ORIGIN.lng + east / (M_PER_DEG_LAT * Math.cos((ORIGIN.lat * Math.PI) / 180)),
  };
}
