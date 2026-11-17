import { Pressable, StyleSheet, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Txt } from '@/components/ui/Txt';
import type { BusView } from '@/hooks/useRiderView';
import { agoLabel, delayLabel, minutesFromSeconds } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space } from '@/theme/tokens';

function statusOf(view: BusView): { text: string; tone: 'ontime' | 'late' | 'neutral' } {
  const a = view.answer;
  if (a.kind === 'not_started') return { text: 'Not started', tone: 'neutral' };
  if (a.kind === 'completed' || a.kind === 'left') return { text: a.kind === 'left' ? 'Passed you' : 'Finished', tone: 'neutral' };
  if (a.kind === 'cancelled') return { text: 'Cancelled', tone: 'late' };
  if (a.kind === 'at_stop') return { text: 'At your stop', tone: 'ontime' };
  return delayLabel(view.live.position?.delaySec ?? view.trip.delay_s);
}

/** One bus on your route today, compact: like a vehicle card on a booking site. */
export function BusCard({ view, now, highlighted, onPress }: { view: BusView; now: number; highlighted?: boolean; onPress?: () => void }) {
  const { colors } = useTheme();
  const status = statusOf(view);
  const a = view.answer;
  const eta = a.kind === 'on_the_way' && Number.isFinite(a.seconds) ? `${minutesFromSeconds(a.seconds)} min` : '–';
  const delaySec = view.live.position?.delaySec ?? view.trip.delay_s;
  const delay = view.live.status === 'active' && delaySec !== null ? `${Math.max(0, Math.round(delaySec / 60))} min` : '–';
  const updated = view.live.status === 'active' ? agoLabel(view.live.position?.t ?? null, now).replace('updated ', '') : '–';

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityHint={onPress ? 'Opens this bus on the map' : undefined}
    >
      <Card highlighted={highlighted} style={{ gap: space[3] }}>
        <View style={styles.top}>
          <View style={[styles.plate, { backgroundColor: highlighted ? colors.accent : colors.surface2 }]}>
            <Txt variant="micro" style={{ fontSize: 9, color: colors.onAccent }}>Bus</Txt>
            <Txt style={[styles.plateNum, { color: highlighted ? colors.onAccent : colors.ink }]}>{view.trip.buses?.number ?? '?'}</Txt>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="label" style={{ fontSize: 17 }} numberOfLines={1}>
              {view.trip.routes?.name ?? 'Route'}
            </Txt>
            <Txt variant="label" color="ink2" style={{ fontFamily: fonts.medium }}>
              {view.trip.period === 'morning' ? 'Morning run' : 'Evening run'} · {view.stops.length} stops
              {view.stops[0]?.scheduled ? ` · starts ${view.stops[0].scheduled}` : ''}
            </Txt>
          </View>
          <Pill text={status.text} tone={status.tone} />
        </View>
        <View style={[styles.stats, { borderTopColor: colors.line }]}>
          <Stat label="ETA" value={eta} />
          <Stat label="Seats" value={String(view.trip.buses?.capacity ?? '–')} />
          <Stat label="Delay" value={delay} tone={delaySec !== null && delaySec >= 120 ? 'late' : undefined} />
          <Stat label="Updated" value={updated} />
        </View>
      </Card>
    </Pressable>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'late' }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Txt variant="micro" color="ink2">{label}</Txt>
      <Txt variant="label" tabular color={tone ?? 'ink'} numberOfLines={1}>{value}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  plate: { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  plateNum: { fontFamily: fonts.black, fontSize: 22, lineHeight: 24 },
  stats: { flexDirection: 'row', borderTopWidth: 1, paddingTop: space[3], gap: space[2] },
});
