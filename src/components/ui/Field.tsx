import { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space, tap } from '@/theme/tokens';
import { Txt } from './Txt';

type Props = TextInputProps & { label: string; hint?: string; error?: string | null };

export const Field = forwardRef<TextInputInstance, Props>(function Field({ label, hint, error, style, ...rest }, ref) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <Txt variant="label" color="ink2">
        {label}
      </Txt>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor={colors.ink2}
        selectionColor={colors.accent}
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        style={[
          styles.input,
          {
            color: colors.ink,
            backgroundColor: colors.surface,
            borderColor: error ? colors.late : focused ? colors.ink : colors.line,
          },
          style,
        ]}
      />
      {error ? (
        <Txt variant="label" color="late" accessibilityLiveRegion="polite">
          {error}
        </Txt>
      ) : hint ? (
        <Txt variant="label" color="ink2" style={{ fontFamily: fonts.medium }}>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: space[2] },
  input: {
    minHeight: tap.min + 4,
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    fontFamily: fonts.semibold,
    fontSize: 17,
  },
});
