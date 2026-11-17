import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { INVITE_LENGTH, normalizeInviteCode } from '@core/invite.ts';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space } from '@/theme/tokens';
import { Txt } from './Txt';

type Props = { value: string; onChange: (code: string) => void; error?: boolean; label: string };

/** Six boxes over one hidden input, so paste, autofill and the system keyboard all just work. */
export function CodeInput({ value, onChange, error, label }: Props) {
  const { colors } = useTheme();
  const input = useRef<TextInputInstance>(null);
  const [focused, setFocused] = useState(false);
  const shake = useSharedValue(0);

  useEffect(() => {
    if (error) shake.value = withSequence(...[10, -10, 6, -6, 0].map((x) => withTiming(x, { duration: 50 })));
  }, [error, shake]);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  return (
    <Pressable onPress={() => input.current?.focus()} accessibilityRole="none">
      <TextInput
        ref={input}
        value={value}
        onChangeText={(text) => onChange(normalizeInviteCode(text).slice(0, INVITE_LENGTH))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        maxLength={INVITE_LENGTH + 2}
        accessibilityLabel={label}
        style={styles.hidden}
      />
      <Animated.View style={[styles.row, shakeStyle]} importantForAccessibility="no-hide-descendants">
        {Array.from({ length: INVITE_LENGTH }, (_, i) => {
          const active = focused && i === Math.min(value.length, INVITE_LENGTH - 1);
          return (
            <View
              key={i}
              style={[
                styles.box,
                {
                  backgroundColor: colors.surface,
                  borderColor: error ? colors.late : active ? colors.ink : colors.line,
                },
              ]}
            >
              <Txt style={styles.char}>{value[i] ?? ''}</Txt>
            </View>
          );
        })}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  row: { flexDirection: 'row', gap: space[2] },
  box: {
    flex: 1,
    aspectRatio: 0.85,
    maxHeight: 64,
    borderWidth: 2,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  char: { fontFamily: fonts.black, fontSize: 26 },
});
