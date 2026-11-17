export type Coord = [lng: number, lat: number];

export type MapStop = {
  id: string;
  coord: Coord;
  name: string;
  state: 'passed' | 'upcoming' | 'mine';
  /** the calm "arriving" pulse when the bus is about 5 minutes from this stop */
  pulse?: boolean;
};

export type MapBus = { id: string; coord: Coord; label: string; stale?: boolean; late?: boolean };

export type BusMapProps = {
  /** the route being followed, in travel order */
  shape?: Coord[] | null;
  /** part of the route already driven, drawn muted */
  driven?: Coord[] | null;
  /** other routes, drawn faint (admin overview) */
  otherShapes?: Coord[][];
  stops?: MapStop[];
  buses?: MapBus[];
  /** camera fits these points when the list changes */
  fit?: Coord[];
  /** space covered by a bottom sheet, so the camera keeps the route visible above it */
  bottomInset?: number;
  onPress?: (coord: Coord) => void;
  onBusPress?: (busId: string) => void;
  accessibilityLabel: string;
};

export function boundsOf(points: Coord[]): [number, number, number, number] | null {
  if (points.length === 0) return null;
  let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [lng, lat] of points) {
    w = Math.min(w, lng);
    e = Math.max(e, lng);
    s = Math.min(s, lat);
    n = Math.max(n, lat);
  }
  // A single point (or a very short route) still needs a sensible zoom.
  const pad = 0.002;
  return [w - pad, s - pad, e + pad, n + pad];
}

export const line = (coords: Coord[]): GeoJSON.Feature<GeoJSON.LineString> => ({
  type: 'Feature',
  properties: {},
  geometry: { type: 'LineString', coordinates: coords },
});

export const lines = (shapes: Coord[][]): GeoJSON.FeatureCollection<GeoJSON.LineString> => ({
  type: 'FeatureCollection',
  features: shapes.filter((s) => s.length > 1).map(line),
});
