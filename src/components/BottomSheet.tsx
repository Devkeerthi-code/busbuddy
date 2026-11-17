import { useEffect, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { useTheme } from '@/theme/ThemeProvider';
import { motion, radius, space } from '@/theme/tokens';

const PEEK = 152;
const FLICK_PROJECTION_S = 0.18;
const RUBBER_BAND = 0.35;

type Props = {
  header: ReactNode;
  children: ReactNode;
  /** visible height after each snap, so the map can keep the bus in view above the sheet */
  onHeightChange?: (height: number) => void;
};

/**
 * Draggable sheet with three snap points (peek / half / full) and real spring physics.
 * Dragging is on the handle and header, so the stop list inside still scrolls normally.
 * On release the flick velocity is projected forward to pick the snap point.
 */
export function BottomSheet({ header, children, onHeightChange }: Props) {
  const { colors } = useTheme();
  const { height: screen } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const full = screen - insets.top - 72;
  const snaps = [PEEK + insets.bottom, Math.round(screen * 0.5), full];
  const visible = useSharedValue(snaps[1]);
  const startAt = useSharedValue(snaps[1]);

  useEffect(() => {
    onHeightChange?.(snaps[1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- report the initial snap once
  }, []);

  const springTo = (target: number, velocity = 0) => {
    'worklet';
    visible.value = withSpring(target, { ...motion.sheetSpring, velocity, reduceMotion: ReduceMotion.System });
    if (onHeightChange) scheduleOnRN(onHeightChange, target);
  };

  const pan = usePanGesture({
    activeOffsetY: [-6, 6],
    onBegin: () => {
      'worklet';
      startAt.value = visible.value;
    },
    onUpdate: (e) => {
      'worklet';
      const raw = startAt.value - e.translationY;
      const min = snaps[0];
      const max = snaps[2];
      visible.value = raw < min ? min - (min - raw) * RUBBER_BAND : raw > max ? max + (raw - max) * RUBBER_BAND : raw;
    },
    onDeactivate: (e) => {
      'worklet';
      const projected = visible.value - e.velocityY * FLICK_PROJECTION_S;
      let best = snaps[0];
      for (const s of snaps) if (Math.abs(s - projected) < Math.abs(best - projected)) best = s;
      springTo(best, -e.velocityY);
    },
  });

  const sheetStyle = useAnimatedStyle(() => ({ height: full, transform: [{ translateY: full - visible.value }] }));

  return (
    <Animated.View
      style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.line }, sheetStyle]}
      accessibilityLabel="Trip details"
    >
      <GestureDetector gesture={pan}>
        <View style={styles.grab} accessibilityRole="adjustable" accessibilityHint="Drag up for all stops, down to see more map">
          <View style={[styles.handle, { backgroundColor: colors.line }]} />
          {header}
        </View>
      </GestureDetector>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space[4], paddingBottom: insets.bottom + space[7] }}>
        {children}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  grab: { paddingHorizontal: space[4], paddingBottom: space[3] },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginVertical: space[3] },
});
