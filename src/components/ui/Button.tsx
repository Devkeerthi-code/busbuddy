import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { motion, radius, space, tap } from '@/theme/tokens';
import { Icon, type IconName } from './Icon';
import { Txt } from './Txt';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  /** disables the button and shows a spinner: prevents double submissions */
  pending?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'primary', icon, pending, disabled, accessibilityHint, style }: Props) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const inactive = disabled || pending;

  const palette = {
    primary: { bg: colors.accent, fg: colors.onAccent, border: colors.accent },
    secondary: { bg: colors.surface, fg: colors.ink, border: colors.line },
    ghost: { bg: 'transparent', fg: colors.ink, border: 'transparent' },
    danger: { bg: colors.surface, fg: colors.late, border: colors.late },
  }[variant];

  return (
    <Animated.View style={[pressStyle, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: !!inactive, busy: !!pending }}
        disabled={inactive}
        onPress={onPress}
        onPressIn={() => scale.set(withTiming(0.97, { duration: motion.fast }))}
        onPressOut={() => scale.set(withTiming(1, { duration: motion.fast }))}
        style={[
          styles.base,
          { backgroundColor: palette.bg, borderColor: palette.border, opacity: disabled && !pending ? 0.45 : 1 },
        ]}
      >
        {pending ? (
          <ActivityIndicator color={palette.fg} />
        ) : (
          <View style={styles.row}>
            {icon && <Icon name={icon} size={20} color={palette.fg} />}
            <Txt variant="label" style={{ color: palette.fg, fontSize: 17 }}>
              {label}
            </Txt>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: tap.min + 4,
    borderRadius: radius.md,
    borderWidth: 2,
    paddingHorizontal: space[5],
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
});
