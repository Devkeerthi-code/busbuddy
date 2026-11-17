import { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BusMap } from '@/components/map/BusMap';
import type { Coord, MapBus } from '@/components/map/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { DemoBadge, Pill } from '@/components/ui/Pill';
import { Skeleton } from '@/components/ui/Skeleton';
import { Txt } from '@/components/ui/Txt';
import { useAsync } from '@/hooks/useAsync';
import { fetchUsage, type UsageTotals } from '@/lib/admin-data';
import { useAuth } from '@/lib/auth';
import { agoLabel, delayLabel } from '@/lib/format';
import { useLiveTrips, useNow } from '@/lib/live';
import { fetchRouteGeometry, fetchRoutes, fetchTodayTrips } from '@/lib/rider-data';
import type { RouteGeometry, TripRow } from '@/lib/types';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

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
    { label: 'Running late', value: late.length, tone: late.length ? ('late' as const) : undefined },
    { label: 'Trips today', value: trips?.length ?? 0 },
    { label: 'Alerts sent today', value: usage.alert_sent?.today ?? 0 },
  ];

  const panel = (
    <View style={{ gap: space[4] }}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Txt variant="title" numberOfLines={1}>{membership?.colleges.name}</Txt>
          <Txt variant="label" color="ink2">Transport office · today</Txt>
        </View>
        {membership?.colleges.is_demo && <DemoBadge />}
      </View>
      {error && <EmptyState icon="wifiOff" title="Can't refresh the fleet" body={error} action={<Button label="Try again" variant="secondary" onPress={load} />} />}
      <View style={styles.counts}>
        {counts.map((c) => (
          <Card key={c.label} style={styles.count}>
            <Txt variant="display" tabular color={c.tone ?? 'ink'} style={{ fontSize: 36, lineHeight: 40 }}>{c.value}</Txt>
            <Txt variant="label" color="ink2">{c.label}</Txt>
          </Card>
        ))}
      </View>
      <View style={{ gap: space[2] }}>
        <Txt variant="micro" color="ink2">Running late</Txt>
        {trips === null ? (
          <Skeleton height={72} rounded={radius.lg} />
        ) : late.length === 0 ? (
          <Card><Txt color="ink2">{active.length ? 'Every live bus is on time.' : 'No buses on the road right now.'}</Txt></Card>
        ) : (
          late.map(({ trip, delay }) => (
            <Card key={trip.id} style={styles.lateRow}>
              <Txt variant="title" style={{ width: 56 }}>{trip.buses?.number}</Txt>
              <View style={{ flex: 1 }}>
                <Txt variant="label" numberOfLines={1}>{trip.routes?.name}</Txt>
                <Txt variant="label" color="ink2">{agoLabel(live[trip.id]?.position?.t ?? null, now)}</Txt>
              </View>
              <Pill text={delayLabel(delay).text} tone="late" />
            </Card>
          ))
        )}
      </View>
      <View style={{ gap: space[2] }}>
        <Txt variant="micro" color="ink2">Today’s trips</Txt>
        {(trips ?? []).map((t) => {
          const status = live[t.id]?.status ?? t.status;
          return (
            <View key={t.id} style={[styles.tripRow, { borderColor: colors.line }]}>
              <Txt variant="label" style={{ width: 44 }}>{t.buses?.number}</Txt>
              <Txt variant="label" color="ink2" style={{ flex: 1 }} numberOfLines={1}>
                {t.routes?.name} · {t.period}
              </Txt>
              <Txt variant="label" color={status === 'active' ? 'ontime' : 'ink2'}>{status}</Txt>
            </View>
          );
        })}
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
        <ScrollView style={styles.side} contentContainerStyle={{ padding: space[5] }}>{panel}</ScrollView>
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

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
  count: { flexGrow: 1, flexBasis: '40%', gap: space[1] },
  lateRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3] },
  tripRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 44, borderBottomWidth: 1 },
  mapBox: { height: 320, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1.5 },
  wide: { flex: 1, flexDirection: 'row' },
  side: { width: 420, maxWidth: '45%' },
  wideMap: { flex: 1 },
});
