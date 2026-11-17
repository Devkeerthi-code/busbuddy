import { StyleSheet, View } from 'react-native';
import type { DelayTone } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { Txt } from './Txt';

/** Status pill: the only place semantic green/red appear. */
export function Pill({ text, tone }: { text: string; tone: DelayTone }) {
  const { colors } = useTheme();
  const fg = tone === 'late' ? colors.late : tone === 'ontime' ? colors.ontime : colors.ink2;
  const bg = tone === 'late' ? colors.lateBg : tone === 'ontime' ? colors.ontimeBg : colors.surface2;
  return (
    <View style={[styles.pill, { backgroundColor: bg }]} accessibilityLabel={text}>
      <View style={[styles.dot, { backgroundColor: fg }]} />
      <Txt variant="label" style={{ color: fg }}>
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
    paddingVertical: space[1],
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  demo: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: radius.sm, paddingHorizontal: space[2], paddingVertical: 2 },
});
