import 'maplibre-gl/dist/maplibre-gl.css';
import { Map as MLMap, Marker, setWorkerUrl, type GeoJSONSource, type MapMouseEvent } from 'maplibre-gl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { BusPlate, MapAttribution, StopDot } from './Markers';
import { fitPadding, useMapStyle } from './style';
import { boundsOf, line, lines, type BusMapProps, type Coord } from './types';

const EMPTY = lines([]);

// Served from public/ (copied by scripts/copy-map-worker.js); respects a GitHub Pages sub-path.
setWorkerUrl(new URL(`${process.env.EXPO_BASE_URL ?? ''}/maplibre-gl-worker.mjs`, window.location.origin).href);

type Overlay = { key: string; coord: Coord; node: React.ReactNode; onClick?: () => void };

/** Web (Expo web) map: maplibre-gl with the same layers as the native map. */
export function BusMap({
  shape,
  driven,
  otherShapes = [],
  stops = [],
  buses = [],
  fit = [],
  bottomInset = 0,
  onPress,
  onBusPress,
  accessibilityLabel,
}: BusMapProps) {
  const { colors, isDark } = useTheme();
  const mapStyle = useMapStyle(isDark);
  const container = useRef<HTMLDivElement | null>(null);
  const map = useRef<MLMap | null>(null);
  const markers = useRef(new globalThis.Map<string, { marker: Marker; el: HTMLDivElement }>());
  const [ready, setReady] = useState(0);
  const onPressRef = useRef(onPress);
  useEffect(() => {
    onPressRef.current = onPress;
  }, [onPress]);

  useEffect(() => {
    if (!container.current || !mapStyle) return;
    const m = new MLMap({
      container: container.current,
      style: mapStyle,
      center: [80.22, 12.93],
      zoom: 11,
      attributionControl: false,
      pitchWithRotate: false,
    });
    m.on('load', () => {
      m.addSource('others', { type: 'geojson', data: EMPTY });
      m.addSource('route', { type: 'geojson', data: EMPTY });
      m.addSource('driven', { type: 'geojson', data: EMPTY });
      const lineLayout = { 'line-cap': 'round', 'line-join': 'round' } as const;
      m.addLayer({ id: 'others-line', type: 'line', source: 'others', layout: lineLayout, paint: { 'line-color': isDark ? colors.boardDim : colors.ink2, 'line-width': 4, 'line-opacity': 0.7 } });
      m.addLayer({ id: 'route-casing', type: 'line', source: 'route', layout: lineLayout, paint: { 'line-color': colors.board, 'line-width': 9 } });
      m.addLayer({ id: 'route-line', type: 'line', source: 'route', layout: lineLayout, paint: { 'line-color': colors.accent, 'line-width': 5 } });
      m.addLayer({ id: 'driven-line', type: 'line', source: 'driven', layout: lineLayout, paint: { 'line-color': colors.boardDim, 'line-width': 5 } });
      setReady((n) => n + 1);
    });
    m.on('click', (e: MapMouseEvent) => onPressRef.current?.([e.lngLat.lng, e.lngLat.lat]));
    map.current = m;
    const known = markers.current;
    return () => {
      known.forEach(({ marker }) => marker.remove());
      known.clear();
      m.remove();
      map.current = null;
    };
    // Layer colours are read once per style; a theme change brings a new style and a new map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapStyle]);

  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    (m.getSource('others') as GeoJSONSource | undefined)?.setData(lines(otherShapes));
    (m.getSource('route') as GeoJSONSource | undefined)?.setData(shape && shape.length > 1 ? line(shape) : EMPTY);
    (m.getSource('driven') as GeoJSONSource | undefined)?.setData(driven && driven.length > 1 ? line(driven) : EMPTY);
  }, [ready, shape, driven, otherShapes]);

  const fitKey = fit.map((c) => c.join(',')).join(';');
  useEffect(() => {
    const m = map.current;
    const b = boundsOf(fit);
    if (!m || !ready || !b) return;
    m.fitBounds([[b[0], b[1]], [b[2], b[3]]], {
      padding: fitPadding(m.getContainer().clientHeight, bottomInset),
      duration: 400,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, fitKey, bottomInset]);

  const overlays: Overlay[] = useMemo(
    () => [
      ...stops.map((s) => ({ key: `stop-${s.id}`, coord: s.coord, node: <StopDot stop={s} /> })),
      ...buses.map((b) => ({
        key: `bus-${b.id}`,
        coord: b.coord,
        node: <BusPlate bus={b} />,
        onClick: onBusPress ? () => onBusPress(b.id) : undefined,
      })),
    ],
    [stops, buses, onBusPress],
  );

  // Keep one DOM marker per overlay; React renders into it through a portal.
  const [elements, setElements] = useState<Record<string, HTMLDivElement>>({});
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const seen = new Set<string>();
    let changed = false;
    for (const o of overlays) {
      seen.add(o.key);
      const existing = markers.current.get(o.key);
      if (existing) {
        existing.marker.setLngLat(o.coord);
        existing.el.onclick = o.onClick ?? null;
        continue;
      }
      const el = document.createElement('div');
      el.onclick = o.onClick ?? null;
      const marker = new Marker({ element: el, anchor: 'center' }).setLngLat(o.coord).addTo(m);
      markers.current.set(o.key, { marker, el });
      changed = true;
    }
    for (const [key, { marker }] of markers.current) {
      if (!seen.has(key)) {
        marker.remove();
        markers.current.delete(key);
        changed = true;
      }
    }
    if (changed) setElements(Object.fromEntries([...markers.current].map(([k, v]) => [k, v.el])));
  }, [overlays, ready]);

  return (
    <View style={styles.fill} accessibilityLabel={accessibilityLabel}>
      <div ref={container} style={{ position: 'absolute', inset: 0 }} />
      {overlays.map((o) => (elements[o.key] ? createPortal(o.node, elements[o.key], o.key) : null))}
      <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { bottom: bottomInset + space[2] }]}>
        <MapAttribution />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1, overflow: 'hidden' } });
