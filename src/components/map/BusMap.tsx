import { Camera, GeoJSONSource, Layer, Map, Marker } from '@maplibre/maplibre-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { BusPlate, MapAttribution, StopDot } from './Markers';
import { fitPadding, useMapStyle } from './style';
import { boundsOf, line, lines, type BusMapProps } from './types';

/** Android/iOS map: MapLibre Native with free OpenFreeMap (OpenStreetMap) tiles. */
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
  const [height, setHeight] = useState(0);
  const fitKey = fit.map((c) => c.join(',')).join(';');
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refit only when the set of points changes
  const bounds = useMemo(() => boundsOf(fit), [fitKey]);

  return (
    <View
      style={[styles.fill, { backgroundColor: colors.surface2 }]}
      accessibilityLabel={accessibilityLabel}
      onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
    >
      {mapStyle && (
        <Map
          style={styles.fill}
          mapStyle={mapStyle}
          attribution={false}
          logo={false}
          compass={false}
          touchPitch={false}
          onPress={onPress ? (e) => onPress(e.nativeEvent.lngLat) : undefined}
        >
          {bounds && height > 0 && (
            <Camera
              bounds={bounds}
              padding={fitPadding(height, bottomInset)}
              duration={400}
              easing="ease"
            />
          )}
          {otherShapes.length > 0 && (
            <GeoJSONSource id="others" data={lines(otherShapes)}>
              <Layer type="line" id="others-line" paint={{ 'line-color': isDark ? colors.boardDim : colors.ink2, 'line-width': 4, 'line-opacity': 0.7 }} layout={{ 'line-cap': 'round', 'line-join': 'round' }} />
            </GeoJSONSource>
          )}
          {shape && shape.length > 1 && (
            <GeoJSONSource id="route" data={line(shape)}>
              <Layer type="line" id="route-casing" paint={{ 'line-color': colors.board, 'line-width': 9 }} layout={{ 'line-cap': 'round', 'line-join': 'round' }} />
              <Layer type="line" id="route-line" paint={{ 'line-color': colors.accent, 'line-width': 5 }} layout={{ 'line-cap': 'round', 'line-join': 'round' }} />
            </GeoJSONSource>
          )}
          {driven && driven.length > 1 && (
            <GeoJSONSource id="driven" data={line(driven)}>
              <Layer type="line" id="driven-line" paint={{ 'line-color': colors.boardDim, 'line-width': 5 }} layout={{ 'line-cap': 'round', 'line-join': 'round' }} />
            </GeoJSONSource>
          )}
          {stops.map((s) => (
            <Marker key={s.id} id={`stop-${s.id}`} lngLat={s.coord} anchor="center">
              <StopDot stop={s} />
            </Marker>
          ))}
          {buses.map((b) => (
            <Marker key={b.id} id={`bus-${b.id}`} lngLat={b.coord} anchor="center" onPress={onBusPress ? () => onBusPress(b.id) : undefined}>
              <BusPlate bus={b} />
            </Marker>
          ))}
        </Map>
      )}
      <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { bottom: bottomInset + space[2] }]}>
        <View style={{ flex: 1 }} pointerEvents="none" />
        <MapAttribution />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
