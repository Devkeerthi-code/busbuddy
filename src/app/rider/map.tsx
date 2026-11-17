import { pointAtDistance, sliceRoute } from '@core/route.ts';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet } from '@/components/BottomSheet';
import { BusMap } from '@/components/map/BusMap';
import type { Coord, MapStop } from '@/components/map/types';
import { StopTimeline } from '@/components/rider/StopTimeline';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pill } from '@/components/ui/Pill';
import { Plate } from '@/components/ui/Plate';
import { Screen } from '@/components/ui/Screen';
import { Txt } from '@/components/ui/Txt';
import { useRiderPrefs } from '@/hooks/useRiderPrefs';
import { useRiderView } from '@/hooks/useRiderView';
import { useAuth } from '@/lib/auth';
import { agoLabel, delayLabel, minutesFromSeconds } from '@/lib/format';
import { useGlide } from '@/lib/glide';
import { track } from '@/lib/rider-data';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space } from '@/theme/tokens';

export default function RiderMap() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { membership } = useAuth();
  const { prefs } = useRiderPrefs();
  const { primary, travelRoute, now, status } = useRiderView(prefs);
  const [sheetHeight, setSheetHeight] = useState(0);

  useEffect(() => track('rider_opened_live'), []);

  const pos = primary?.live.position ?? null;
  const progress = useGlide(primary?.live.status === 'active' && pos ? pos.progress : null);
  const doneSeq = pos?.doneSeq ?? primary?.trip.done_seq ?? -1;
  const arriving = primary?.answer.kind === 'on_the_way' && primary.answer.arriving;

  const shape = useMemo<Coord[] | null>(() => travelRoute?.points.map((p) => [p.lng, p.lat]) ?? null, [travelRoute]);
  const stops = useMemo<MapStop[]>(
    () =>
      (primary?.stops ?? []).map((s) => ({
        id: s.id,
        coord: [s.lng, s.lat],
        name: s.name,
        state: s.id === prefs?.stopId ? 'mine' : s.travelSeq <= doneSeq ? 'passed' : 'upcoming',
        pulse: s.id === prefs?.stopId && arriving,
      })),
    [primary?.stops, prefs?.stopId, doneSeq, arriving],
  );
  const busCoord = useMemo<Coord | null>(() => {
    if (!travelRoute || progress === null) return null;
    const p = pointAtDistance(travelRoute, progress);
    return [p.lng, p.lat];
  }, [travelRoute, progress]);
  const driven = useMemo<Coord[] | null>(
    () => (travelRoute && progress !== null ? sliceRoute(travelRoute, 0, progress).map((p) => [p.lng, p.lat] as Coord) : null),
    [travelRoute, progress],
  );
  const fit = useMemo<Coord[]>(() => stops.map((s) => s.coord), [stops]);

  if (!prefs) {
    return (
      <Screen inTabs>
        <EmptyState icon="map" title="Pick your stop first" body="Choose your route and stop on the My bus tab, then the live map shows your bus." />
      </Screen>
    );
  }

  const answer = primary?.answer;
  const delay = delayLabel(pos?.delaySec ?? primary?.trip.delay_s ?? null);
  const headline =
    answer?.kind === 'on_the_way' && Number.isFinite(answer.seconds)
      ? `${minutesFromSeconds(answer.seconds)}`
      : answer?.kind === 'at_stop'
        ? 'Here'
        : answer?.kind === 'left'
          ? 'Left'
          : answer?.kind === 'not_started'
            ? answer.departsAt ?? '--'
            : status === 'loading'
              ? '…'
              : '–';
  const sub = primary
    ? `Bus ${primary.trip.buses?.number ?? '?'} to ${primary.myStop?.name ?? 'your stop'} · ${
        primary.live.status === 'active' ? agoLabel(pos?.t ?? null, now) : primary.live.status === 'scheduled' ? 'not started yet' : 'trip over'
      }`
    : 'No bus on this route right now';

  return (
    <View style={[styles.fill, { backgroundColor: colors.bg }]}>
      <BusMap
        accessibilityLabel={`Map of ${membership?.colleges.name ?? 'your'} bus route`}
        shape={shape}
        driven={driven}
        stops={stops}
        buses={busCoord && primary ? [{ id: primary.trip.id, coord: busCoord, label: primary.trip.buses?.number ?? '?', stale: primary.stale, late: delay.tone === 'late' }] : []}
        fit={fit}
        bottomInset={sheetHeight}
      />
      {primary && (
        <View style={[styles.topBar, { top: insets.top + space[2] }]} pointerEvents="none">
          <View style={[styles.routeChip, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <Plate number={primary.trip.buses?.number ?? '?'} size="sm" off={primary.live.status !== 'active'} />
            <Txt variant="label" numberOfLines={1} style={{ flexShrink: 1 }}>{primary.trip.routes?.name ?? ''}</Txt>
            {primary.live.status === 'active' && <View style={[styles.liveDot, { backgroundColor: colors.ontime }]} />}
          </View>
        </View>
      )}
      <BottomSheet
        onHeightChange={setSheetHeight}
        header={
          <View style={styles.sheetHead} accessibilityLiveRegion="polite">
            <View style={styles.etaRow}>
              <Txt style={{ fontFamily: fonts.black, fontSize: 44, lineHeight: 48, color: primary?.stale ? colors.boardDim : colors.ink }} tabular>
                {primary?.stale && answer?.kind === 'on_the_way' ? '~' : ''}
                {headline}
              </Txt>
              {answer?.kind === 'on_the_way' && <Txt variant="title">min</Txt>}
              <View style={{ flex: 1 }} />
              {primary?.live.status === 'active' && <Pill text={delay.text} tone={delay.tone} />}
            </View>
            <Txt variant="label" color="ink2">{sub}</Txt>
          </View>
        }
      >
        <Txt variant="micro" color="ink2" style={{ marginBottom: space[2] }}>
          Stops · {prefs.period === 'morning' ? 'morning run' : 'evening run'}
        </Txt>
        <StopTimeline
          stops={primary?.stops ?? []}
          doneSeq={doneSeq}
          myStopId={prefs.stopId}
          etas={pos?.etas ?? []}
          live={primary?.live.status === 'active'}
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  topBar: { position: 'absolute', left: space[4], right: space[4], flexDirection: 'row' },
  routeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    maxWidth: '100%',
    paddingLeft: space[1],
    paddingRight: space[4],
    paddingVertical: space[1],
    borderRadius: radius.md,
    borderWidth: 1,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  sheetHead: { gap: space[1] },
  etaRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space[2] },
});
