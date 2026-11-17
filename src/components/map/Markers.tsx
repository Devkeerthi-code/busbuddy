import { useEffect } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, motion, radius, space } from '@/theme/tokens';
import type { MapBus, MapStop } from './types';

/** The bus as its own number plate: amber, ink digits, readable at a glance. */
export function BusPlate({ bus }: { bus: MapBus }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityLabel={`Bus ${bus.label}${bus.stale ? ', last position may be old' : ''}`}
      style={[
        styles.plate,
        { backgroundColor: bus.stale ? colors.boardDim : colors.accent, borderColor: bus.late ? colors.late : colors.board },
      ]}
    >
      <Txt style={[styles.plateText, { color: colors.onAccent }]}>{bus.label}</Txt>
    </View>
  );
}

export function StopDot({ stop }: { stop: MapStop }) {
  const { colors } = useTheme();
  const ring = useSharedValue(0);

  useEffect(() => {
    ring.value = stop.pulse
      ? withRepeat(withTiming(1, { duration: motion.pulseMs, easing: Easing.out(Easing.quad), reduceMotion: ReduceMotion.System }), -1, false)
      : 0;
  }, [stop.pulse, ring]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: stop.pulse ? 0.9 * (1 - ring.value) : 0,
    transform: [{ scale: 1 + 1.6 * ring.value }],
  }));

  const mine = stop.state === 'mine';
  const size = mine ? 20 : 12;
  return (
    <View style={styles.stopWrap} accessibilityLabel={`${stop.name}${mine ? ', your stop' : stop.state === 'passed' ? ', passed' : ''}`}>
      {mine && <Animated.View style={[styles.ring, { borderColor: colors.accent }, ringStyle]} />}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: mine ? colors.accent : stop.state === 'passed' ? colors.surface2 : colors.surface,
          borderWidth: mine ? 4 : 3,
          borderColor: stop.state === 'passed' ? colors.line : colors.board,
        }}
      />
    </View>
  );
}

export function MapAttribution() {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel="Map data from OpenStreetMap contributors, tiles by OpenFreeMap"
      onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright')}
      style={[styles.attribution, { backgroundColor: colors.surface }]}
    >
      <Txt style={{ fontSize: 11, lineHeight: 14, fontFamily: fonts.semibold }} color="ink2">
        © OpenStreetMap contributors · OpenFreeMap
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  plate: {
    minWidth: 36,
    height: 28,
    paddingHorizontal: space[2],
    borderRadius: radius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateText: { fontFamily: fonts.black, fontSize: 15, lineHeight: 18 },
  stopWrap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 20, height: 20, borderRadius: 10, borderWidth: 3 },
  attribution: {
    position: 'absolute',
    right: space[2],
    bottom: 0,
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: radius.sm,
    opacity: 0.92,
  },
});
