import { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BusMap } from '@/components/map/BusMap';
import type { Coord, MapBus } from '@/components/map/types';
import { Button } from '@/components/ui/Button';
import { BoardTexture } from '@/components/ui/BoardTexture';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { ListGroup, ListRow } from '@/components/ui/List';
import { DemoBadge, Pill } from '@/components/ui/Pill';
import { Plate } from '@/components/ui/Plate';
import { Skeleton } from '@/components/ui/Skeleton';
import { Txt } from '@/components/ui/Txt';
import { useAsync } from '@/hooks/useAsync';
import { fetchUsage, type UsageTotals } from '@/lib/admin-data';
import { useAuth } from '@/lib/auth';
import { agoLabel, delayLabel } from '@/lib/format';
import { useLiveTrips, useNow } from '@/lib/live';
import { fetchRouteGeometry, fetchRoutes, fetchTodayTrips } from '@/lib/rider-data';
import type { RouteGeometry, TripRow, TripStatus as TripRowStatus } from '@/lib/types';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space, tap } from '@/theme/tokens';

const LATE_SECONDS = 120;
const NO_TRIPS: TripRow[] = [];

async function loadFleetData(collegeId: string | null) {
  const [trips, routeRows, usage] = await Promise.all([fetchTodayTrips(), fetchRoutes(), fetchUsage(collegeId)]);
  const routes = (await Promise.all(routeRows.map((x) => fetchRouteGeometry(x.id)))).filter((g): g is RouteGeometry => !!g);
  return { trips, routes, usage };
}

export default function AdminLive() {
  const { membership } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const now = useNow(5000);
  const collegeId = membership?.college_id ?? null;
  const loadFleet = useCallback(() => loadFleetData(collegeId), [collegeId]);
  const { data, error, reload: load } = useAsync(loadFleet);
  const trips = data?.trips ?? null;
  const usage: UsageTotals = data?.usage ?? {};

  const live = useLiveTrips(trips ?? NO_TRIPS, load, 'college', membership?.college_id);

  const active = useMemo(
    () => (trips ?? []).filter((t) => (live[t.id]?.status ?? t.status) === 'active'),
    [trips, live],
  );
  const late = useMemo(
    () =>
      active
        .map((t) => ({ trip: t, delay: live[t.id]?.position?.delaySec ?? t.delay_s }))
        .filter((x) => x.delay !== null && x.delay >= LATE_SECONDS)
        .sort((a, b) => (b.delay ?? 0) - (a.delay ?? 0)),
    [active, live],
  );
  const buses: MapBus[] = active.flatMap((t) => {
    const p = live[t.id]?.position;
    if (!p) return [];
    const delay = p.delaySec ?? 0;
    return [{ id: t.id, coord: [p.lng, p.lat] as Coord, label: t.buses?.number ?? '?', stale: now - p.t > 60_000, late: delay >= LATE_SECONDS }];
  });
  const shapes = useMemo(
    () => (data?.routes ?? []).map((r) => r.shape ?? []).filter((s) => s.length > 1) as Coord[][],
    [data?.routes],
  );
  const fit = useMemo(() => shapes.flat(), [shapes]);

  const counts = [
    { label: 'Buses live', value: active.length },
    { label: 'Running late', value: late.length, late: late.length > 0 },
    { label: 'Trips today', value: trips?.length ?? 0 },
    { label: 'Alerts today', value: usage.alert_sent?.today ?? 0 },
  ];

  const panel = (
    <View style={{ gap: space[5] }}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Txt variant="title" numberOfLines={2}>{membership?.colleges.name}</Txt>
          <Txt variant="label" color="ink2" style={{ fontFamily: fonts.medium }}>Transport office · today</Txt>
        </View>
        {membership?.colleges.is_demo && <DemoBadge />}
      </View>
      {error && <EmptyState icon="wifiOff" title="Can’t refresh the fleet" body={error} action={<Button label="Try again" variant="secondary" onPress={load} />} />}
      <View style={[styles.counts, { backgroundColor: colors.board }]} accessibilityRole="summary">
        <BoardTexture id="fleet-board-dots" />
        {counts.map((c, i) => (
          <View
            key={c.label}
            accessible
            accessibilityLabel={`${c.value} ${c.label}`}
            style={[styles.count, i > 0 && { borderLeftWidth: 1, borderLeftColor: colors.boardRule }]}
          >
            <Txt variant="display" tabular style={[styles.countValue, { color: c.late ? colors.boardLate : colors.boardInk }]}>
              {c.value}
            </Txt>
            <Txt variant="micro" numberOfLines={2} style={{ color: colors.boardMuted, fontSize: 11, letterSpacing: 0.8 }}>
              {c.label}
            </Txt>
          </View>
        ))}
      </View>
      <View style={{ gap: space[2] }}>
        <Txt variant="micro" color="ink2">Running late</Txt>
        {trips === null ? (
          <Skeleton height={64} rounded={radius.lg} />
        ) : late.length === 0 ? (
          <View style={[styles.allClear, { backgroundColor: colors.ontimeBg }]}>
            <Icon name="check" size={20} color={colors.ontime} />
            <Txt variant="label" color="ontime">{active.length ? 'Every live bus is on time.' : 'No buses on the road right now.'}</Txt>
          </View>
        ) : (
          <ListGroup>
            {late.map(({ trip, delay }) => (
              <ListRow
                key={trip.id}
                leading={<Plate number={trip.buses?.number ?? '?'} size="sm" />}
                title={trip.routes?.name ?? 'Route'}
                detail={agoLabel(live[trip.id]?.position?.t ?? null, now)}
                trailing={<Pill text={delayLabel(delay).text} tone="late" />}
              />
            ))}
          </ListGroup>
        )}
      </View>
      <View style={{ gap: space[2] }}>
        <Txt variant="micro" color="ink2">Today’s trips</Txt>
        {trips === null && <Skeleton height={160} rounded={radius.lg} />}
        {trips && trips.length > 0 && (
          <ListGroup>
            {trips.map((t) => {
              const status = live[t.id]?.status ?? t.status;
              const fix = live[t.id]?.position?.t ?? null;
              return (
                <ListRow
                  key={t.id}
                  leading={<Plate number={t.buses?.number ?? '?'} size="sm" off={status !== 'active'} />}
                  title={t.routes?.name ?? 'Route'}
                  detail={`${t.period === 'morning' ? 'Morning run' : 'Evening run'}${status === 'active' && fix ? ` · ${agoLabel(fix, now)}` : ''}`}
                  trailing={<TripStatus status={status} />}
                />
              );
            })}
          </ListGroup>
        )}
        {trips?.length === 0 && <Txt color="ink2">No trips planned today. Add them under Setup → Trips.</Txt>}
      </View>
    </View>
  );

  const map = (
    <BusMap accessibilityLabel="All active buses" otherShapes={shapes} buses={buses} fit={fit} />
  );

  if (wide) {
    return (
      <View style={[styles.wide, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
        <ScrollView style={[styles.side, { borderRightColor: colors.line }]} contentContainerStyle={{ padding: space[5] }}>{panel}</ScrollView>
        <View style={styles.wideMap}>{map}</View>
      </View>
    );
  }
  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: insets.top + space[4], padding: space[4], gap: space[4] }}>
      <View style={[styles.mapBox, { borderColor: colors.line }]}>{map}</View>
      {panel}
    </ScrollView>
  );
}

const STATUS_TEXT: Record<TripRowStatus, string> = { active: 'Live', scheduled: 'Scheduled', completed: 'Done', cancelled: 'Cancelled' };

function TripStatus({ status }: { status: TripRowStatus }) {
  const { colors } = useTheme();
  const color = status === 'active' ? colors.ontime : status === 'cancelled' ? colors.late : colors.ink2;
  return (
    <View style={styles.status}>
      {status === 'active' && <View style={[styles.liveDot, { backgroundColor: colors.ontime }]} />}
      <Txt variant="label" style={{ color }}>{STATUS_TEXT[status]}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  counts: { flexDirection: 'row', borderRadius: radius.lg, overflow: 'hidden', paddingVertical: space[4] },
  count: { flex: 1, minWidth: 0, gap: space[1], paddingHorizontal: space[3] },
  countValue: { fontSize: 36, lineHeight: 40, letterSpacing: -1 },
  allClear: { flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: tap.min, paddingHorizontal: space[4], borderRadius: radius.lg },
  status: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  mapBox: { height: 320, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1.5 },
  wide: { flex: 1, flexDirection: 'row' },
  side: { width: 420, maxWidth: '45%', borderRightWidth: 1 },
  wideMap: { flex: 1 },
});
