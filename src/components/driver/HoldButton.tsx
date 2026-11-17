import * as Haptics from 'expo-haptics';
import { useRef } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Icon } from '@/components/ui/Icon';
import { Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeProvider';
import { motion, radius, space } from '@/theme/tokens';

/** Ending a trip needs a deliberate 1.2 s hold, so a bump in a phone holder can't stop tracking. */
export function HoldButton({ label, onComplete, disabled }: { label: string; onComplete: () => void; disabled?: boolean }) {
  const { colors } = useTheme();
  const progress = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fill = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  function begin() {
    progress.value = withTiming(1, { duration: motion.holdToEndMs, easing: Easing.linear });
    timer.current = setTimeout(() => {
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete();
    }, motion.holdToEndMs);
  }

  function cancel() {
    if (timer.current) clearTimeout(timer.current);
    cancelAnimation(progress);
    progress.value = withTiming(0, { duration: motion.base });
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Press and hold for about a second"
      accessibilityActions={[{ name: 'activate', label }]}
      onAccessibilityAction={onComplete}
      disabled={disabled}
      onPressIn={begin}
      onPressOut={cancel}
      style={[styles.button, { borderColor: colors.late, backgroundColor: colors.surface }]}
    >
      <Animated.View style={[styles.fill, { backgroundColor: colors.lateBg }, fill]} />
      <View style={styles.row}>
        <Icon name="clock" size={22} color={colors.late} />
        <Txt variant="title" style={{ color: colors.late }}>{label}</Txt>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 76, borderRadius: radius.lg, borderWidth: 3, overflow: 'hidden', justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2] },
});
