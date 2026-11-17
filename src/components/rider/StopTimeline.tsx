import { StyleSheet, View } from 'react-native';
import { Txt } from '@/components/ui/Txt';
import type { TravelStop } from '@/hooks/useRiderView';
import { minutesFromSeconds } from '@/lib/format';
import type { StopEta } from '@/lib/types';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space } from '@/theme/tokens';

type Props = { stops: TravelStop[]; doneSeq: number; myStopId: string | null; etas: StopEta[]; live: boolean };

/** Vertical timeline: passed stops dimmed, your stop highlighted, live ETAs beside the timetable. */
export function StopTimeline({ stops, doneSeq, myStopId, etas, live }: Props) {
  const { colors } = useTheme();
  const etaBySeq = new Map(etas.map((e) => [e.seq, e.seconds]));

  return (
    <View accessibilityRole="list">
      {stops.map((stop, i) => {
        const passed = stop.travelSeq <= doneSeq;
        const mine = stop.id === myStopId;
        const eta = etaBySeq.get(stop.travelSeq);
        const last = i === stops.length - 1;
        return (
          <View
            key={stop.id}
            style={styles.row}
            accessible
            accessibilityLabel={`${stop.name}${mine ? ', your stop' : ''}${passed ? ', passed' : ''}${
              stop.scheduled ? `, scheduled ${stop.scheduled}` : ''
            }${live && eta !== undefined && !passed ? `, about ${minutesFromSeconds(eta)} minutes away` : ''}`}
          >
            <View style={styles.rail}>
              <View style={[styles.segment, { backgroundColor: i === 0 ? 'transparent' : passed ? colors.accent : colors.line }]} />
              <View
                style={[
                  styles.dot,
                  mine ? styles.dotMine : null,
                  {
                    backgroundColor: mine ? colors.accent : passed ? colors.accent : colors.surface,
                    borderColor: mine ? colors.board : passed ? colors.accent : colors.line,
                  },
                ]}
              />
              <View style={[styles.segment, { backgroundColor: last ? 'transparent' : stop.travelSeq < doneSeq ? colors.accent : colors.line }]} />
            </View>
            <View style={[styles.body, mine && { backgroundColor: colors.surface2 }]}>
              <View style={{ flex: 1 }}>
                <Txt
                  style={{ fontFamily: mine ? fonts.black : fonts.semibold, fontSize: 17 }}
                  color={passed && !mine ? 'ink2' : 'ink'}
                  numberOfLines={1}
                >
                  {stop.name}
                </Txt>
                {mine && <Txt variant="micro" color="accentText">Your stop</Txt>}
              </View>
              {live && eta !== undefined && !passed ? (
                <Txt variant="label" tabular>{minutesFromSeconds(eta)} min</Txt>
              ) : null}
              <Txt
                variant="label"
                tabular
                color="ink2"
                style={passed ? { textDecorationLine: 'line-through' } : undefined}
              >
                {stop.scheduled ?? ''}
              </Txt>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', minHeight: 52 },
  rail: { width: 28, alignItems: 'center' },
  segment: { width: 3, flex: 1 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 3 },
  dotMine: { width: 20, height: 20, borderRadius: 10 },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[3],
    borderRadius: radius.md,
    marginVertical: 2,
  },
});
