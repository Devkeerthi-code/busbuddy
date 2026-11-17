import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Picker } from '@/components/ui/Picker';
import { Segmented } from '@/components/ui/Segmented';
import { Skeleton } from '@/components/ui/Skeleton';
import { Txt } from '@/components/ui/Txt';
import { useAsync } from '@/hooks/useAsync';
import { friendlyError } from '@/lib/errors';
import { fetchRouteGeometry, fetchRoutes, type RiderPrefs } from '@/lib/rider-data';
import type { Period, RouteGeometry } from '@/lib/types';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space } from '@/theme/tokens';

type Props = {
  campus: string;
  initial: RiderPrefs | null;
  onSave: (prefs: RiderPrefs) => Promise<void>;
};

/** "Where's my bus?" as a question: From [your stop] -> To [campus], Morning / Evening. Asked once. */
export function TripQuestion({ campus, initial, onSave }: Props) {
  const { colors } = useTheme();
  const routesQuery = useAsync(fetchRoutes);
  const routes = routesQuery.data;
  const [period, setPeriod] = useState<Period>(initial?.period ?? (new Date().getHours() < 13 ? 'morning' : 'evening'));
  const [chosenRoute, setRouteId] = useState<string | null>(initial?.routeId ?? null);
  // With a single route there's nothing to choose.
  const routeId = chosenRoute ?? (routes?.length === 1 ? routes[0].id : null);
  const loadGeo = useCallback(() => (routeId ? fetchRouteGeometry(routeId) : Promise.resolve(null)), [routeId]);
  const geoQuery = useAsync(loadGeo);
  const geo: RouteGeometry | null = geoQuery.data?.routeId === routeId ? geoQuery.data : null;
  const [stopId, setStopId] = useState<string | null>(initial?.stopId ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);


  const stopOptions = useMemo(
    () => (geo?.stops ?? []).map((s) => ({ value: s.id, label: s.name, detail: `Stop ${s.seq + 1} of ${geo?.stops.length}` })),
    [geo],
  );
  const stopName = geo?.stops.find((s) => s.id === stopId)?.name ?? null;

  const loadError = routesQuery.error ?? geoQuery.error;
  if (routes === null && !loadError) {
    return (
      <View style={{ gap: space[3] }}>
        <Skeleton height={48} />
        <Skeleton height={260} rounded={radius.lg} />
      </View>
    );
  }
  if (routes && routes.length === 0) {
    return (
      <EmptyState
        icon="route"
        title="No routes yet"
        body="Your transport office hasn’t added any bus routes. Check back after they set up the fleet."
      />
    );
  }

  async function submit() {
    if (!routeId || !stopId) return setError('Choose your route and your stop.');
    setError(null);
    setPending(true);
    try {
      await onSave({ routeId, stopId, period, alerts: initial?.alerts ?? true });
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setPending(false);
    }
  }

  const endpoints = period === 'morning' ? [stopName ?? 'Your stop', campus] : [campus, stopName ?? 'Your stop'];

  return (
    <Card style={{ gap: space[4] }}>
      <Segmented
        accessibilityLabel="Morning or evening trip"
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'morning', label: 'Morning', icon: 'sun' },
          { value: 'evening', label: 'Evening', icon: 'moon' },
        ]}
      />
      <Picker
        label="Route"
        placeholder="Choose your bus route"
        options={(routes ?? []).map((r) => ({ value: r.id, label: r.name }))}
        value={routeId}
        onChange={(id) => {
          setRouteId(id);
          setStopId(null);
        }}
      />
      <View style={styles.legs}>
        <View style={styles.rail}>
          <View style={[styles.ring, { borderColor: colors.ink }]} />
          <View style={[styles.dash, { borderColor: colors.ink2 }]} />
          <View style={[styles.square, { backgroundColor: colors.ink }]} />
        </View>
        <View style={{ flex: 1, gap: space[3] }}>
          {period === 'morning' ? (
            <Picker label="From · your stop" placeholder="Choose your stop" options={stopOptions} value={stopId} onChange={setStopId} disabled={!geo} />
          ) : (
            <Fixed label="From" value={campus} />
          )}
          {period === 'evening' ? (
            <Picker label="To · your stop" placeholder="Choose your stop" options={stopOptions} value={stopId} onChange={setStopId} disabled={!geo} />
          ) : (
            <Fixed label="To" value={campus} />
          )}
        </View>
      </View>
      {(error ?? loadError) && <Txt variant="label" color="late" accessibilityLiveRegion="polite">{error ?? loadError}</Txt>}
      <Button
        label="Show my bus"
        pending={pending}
        disabled={!routeId || !stopId}
        onPress={submit}
        accessibilityHint={`Saves ${endpoints[0]} to ${endpoints[1]} on this phone`}
      />
    </Card>
  );
}

function Fixed({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space[2] }}>
      <Txt variant="label" color="ink2">{label}</Txt>
      <View style={[styles.fixed, { backgroundColor: colors.surface2 }]}>
        <Txt style={{ fontFamily: fonts.semibold, fontSize: 17 }}>{value}</Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legs: { flexDirection: 'row', gap: space[3] },
  rail: { width: 16, alignItems: 'center', paddingTop: 44, paddingBottom: 22 },
  ring: { width: 14, height: 14, borderRadius: 7, borderWidth: 3 },
  dash: { flex: 1, borderLeftWidth: 2, borderStyle: 'dashed', marginVertical: 4 },
  square: { width: 12, height: 12, borderRadius: 2 },
  fixed: { minHeight: 52, borderRadius: radius.md, justifyContent: 'center', paddingHorizontal: space[4] },
});
