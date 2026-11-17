import { StyleSheet, View } from 'react-native';
import type { DelayTone } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { Txt } from './Txt';

/** Status pill: the only place semantic green/red appear. `onBoard` swaps to the dark destination-board shades. */
export function Pill({ text, tone, onBoard }: { text: string; tone: DelayTone; onBoard?: boolean }) {
  const { colors } = useTheme();
  const shades = onBoard
    ? { late: [colors.boardLate, colors.boardLateBg], ontime: [colors.boardOk, colors.boardOkBg], neutral: [colors.boardIdle, colors.boardIdleBg] }
    : { late: [colors.late, colors.lateBg], ontime: [colors.ontime, colors.ontimeBg], neutral: [colors.ink2, colors.surface2] };
  const [fg, bg] = shades[tone];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]} accessibilityLabel={text}>
      <View style={[styles.dot, tone === 'neutral' ? { borderWidth: 2, borderColor: fg } : { backgroundColor: fg }]} />
      <Txt variant="label" style={{ color: fg }} numberOfLines={1}>
        {text}
      </Txt>
    </View>
  );
}

export function DemoBadge() {
  const { colors } = useTheme();
  return (
    <View style={[styles.demo, { borderColor: colors.accentText }]} accessibilityLabel="Demo data">
      <Txt variant="micro" color="accentText">
        Demo
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[3],
    minHeight: 28,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  demo: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: radius.sm, paddingHorizontal: space[2], paddingVertical: 2 },
});
