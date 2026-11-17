import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { BoardTexture } from '@/components/ui/BoardTexture';
import { Pill } from '@/components/ui/Pill';
import { Txt } from '@/components/ui/Txt';
import type { BusView } from '@/hooks/useRiderView';
import { agoLabel, delayLabel, minutesFromSeconds } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space } from '@/theme/tokens';

/** The destination board: the whole answer in one glance. Stays dark in both themes. */
export function EtaBoard({ view, now, campus }: { view: BusView; now: number; campus: string }) {
  const { colors } = useTheme();
  const { answer, trip, live, stale } = view;
  const bus = trip.buses?.number ?? '?';
  const pos = live.position;
  const delay = delayLabel(pos?.delaySec ?? trip.delay_s);
  const arriving = answer.kind === 'on_the_way' && answer.arriving;

  let big: string;
  let unit = '';
  let line: string;
  switch (answer.kind) {
    case 'on_the_way':
      big = Number.isFinite(answer.seconds) ? String(minutesFromSeconds(answer.seconds)).padStart(2, '0') : '--';
      unit = 'min';
      line = arriving ? 'Arriving soon. Head to your stop.' : `to ${view.myStop?.name ?? 'your stop'}`;
      break;
    case 'at_stop':
      big = 'Here';
      line = `Bus ${bus} is at ${view.myStop?.name ?? 'your stop'} now`;
      break;
    case 'left':
      big = 'Left';
      line = answer.at ? `Bus left your stop at ${answer.at}` : 'Bus has passed your stop';
      break;
    case 'not_started':
      big = answer.departsAt ?? '--:--';
      line = trip.period === 'morning' ? 'Scheduled start. Not on the road yet.' : `Leaves ${campus} at this time`;
      break;
    case 'completed':
      big = 'Done';
      line = 'This trip has finished for today';
      break;
    case 'cancelled':
      big = 'Off';
      line = 'Cancelled by the transport office today';
      break;
  }

  const digitsColor = stale ? colors.boardDim : colors.boardInk;
  const accessible = `${answer.kind === 'on_the_way' ? `${big} minutes` : big}. ${line}. Bus ${bus}.`;

  return (
    <View
      accessible
      accessibilityRole="summary"
      accessibilityLabel={accessible}
      style={[styles.board, { backgroundColor: colors.board, borderColor: arriving ? colors.accent : colors.board }]}
    >
      <BoardTexture id="eta-board-dots" />
      <View style={styles.top}>
        <Txt variant="micro" numberOfLines={1} style={{ color: colors.boardInk, flex: 1 }}>
          Bus {bus} · {trip.routes?.name ?? ''}
        </Txt>
        {arriving && (
          <View style={[styles.arriving, { backgroundColor: colors.accent }]}>
            <Txt variant="micro" style={{ color: colors.onAccent }}>Arriving</Txt>
          </View>
        )}
      </View>
      <View style={styles.row}>
        {stale && answer.kind === 'on_the_way' && <Txt style={[styles.approx, { color: digitsColor }]}>~</Txt>}
        <Animated.View key={big} entering={FadeInDown.duration(180)} exiting={FadeOutUp.duration(120)}>
          <Txt variant="eta" tabular style={{ color: digitsColor, fontSize: big.length > 3 ? 64 : 88 }}>
            {big}
          </Txt>
        </Animated.View>
        {unit ? <Txt style={[styles.unit, { color: digitsColor }]}>{unit.toUpperCase()}</Txt> : null}
      </View>
      <Txt variant="label" style={{ color: colors.boardText, fontSize: 16 }}>
        {line}
      </Txt>
      {live.status === 'active' && (
        <View style={[styles.meta, { borderTopColor: colors.boardRule }]}>
          <Pill text={delay.text} tone={delay.tone} onBoard />
          <Txt variant="label" style={{ color: stale ? colors.accent : colors.boardMuted }}>
            {stale ? `Signal weak · ${agoLabel(pos?.t ?? null, now)}` : agoLabel(pos?.t ?? null, now)}
          </Txt>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  board: { borderRadius: radius.lg, padding: space[5], gap: space[2], borderWidth: 3, overflow: 'hidden' },
  top: { flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 24 },
  arriving: { borderRadius: radius.sm, paddingHorizontal: space[2], paddingVertical: 2 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space[2], minHeight: 92 },
  approx: { fontFamily: fonts.black, fontSize: 48, lineHeight: 72 },
  unit: { fontFamily: fonts.black, fontSize: 24, lineHeight: 40, letterSpacing: 1.5 },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    flexWrap: 'wrap',
    marginTop: space[2],
    paddingTop: space[3],
    borderTopWidth: 1,
  },
});
