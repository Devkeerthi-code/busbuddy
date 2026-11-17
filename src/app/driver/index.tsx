import { Redirect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { HoldButton } from '@/components/driver/HoldButton';
import { AccountSettings } from '@/components/AccountSettings';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { DemoBadge } from '@/components/ui/Pill';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { Txt } from '@/components/ui/Txt';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { minutesFromSeconds, shortTime } from '@/lib/format';
import {
  activeTrip,
  ensureDriverPermissions,
  flushQueue,
  lastStatus,
  startTripTracking,
  stopTripTracking,
  type PermissionProblem,
  type TripStatusSnapshot,
} from '@/lib/location-task';
import { fetchRouteGeometry, fetchStopTimes, fetchTodayTrips } from '@/lib/rider-data';
import { supabase } from '@/lib/supabase';
import type { TripRow } from '@/lib/types';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space } from '@/theme/tokens';

type Plan = { trip: TripRow; firstStop: string; firstTime: string | null; stopCount: number };

const PERMISSION_COPY: Record<Exclude<PermissionProblem, null>, string> = {
  services_off: 'Location is switched off on this phone. Turn it on in the quick settings, then try again.',
  foreground: 'BusBuddy needs location permission to share where the bus is.',
  background: 'Choose "Allow all the time" so sharing continues with the screen off. It only runs during a trip.',
};

function pickTrip(trips: TripRow[]): TripRow | null {
  return trips.find((t) => t.status === 'active') ?? trips.find((t) => t.status === 'scheduled') ?? null;
}

async function loadDriverDay(userId: string): Promise<{ trips: TripRow[]; plan: Plan | null }> {
  const trips = (await fetchTodayTrips()).filter((t) => t.driver_id === userId);
  const next = pickTrip(trips);
  if (!next) return { trips, plan: null };
  const [geo, times] = await Promise.all([fetchRouteGeometry(next.route_id), fetchStopTimes([next.template_id])]);
  const ordered = [...(geo?.stops ?? [])].sort((a, b) => (next.period === 'evening' ? b.seq - a.seq : a.seq - b.seq));
  const first = ordered[0];
  return {
    trips,
    plan: {
      trip: next,
      firstStop: first?.name ?? 'the first stop',
      firstTime: first ? shortTime(times[next.template_id]?.[first.id]) : null,
      stopCount: ordered.length,
    },
  };
}

export default function DriverHome() {
  const { session, membership } = useAuth();
  const { colors } = useTheme();
  const toast = useToast();
  const userId = session?.user.id ?? '';
  const loadDay = useCallback(() => loadDriverDay(userId), [userId]);
  const { data, error, reload: load } = useAsync(loadDay);
  const trips = data?.trips ?? null;
  const plan = data?.plan ?? null;
  const [permission, setPermission] = useState<PermissionProblem>(null);
  const [pending, setPending] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [snapshot, setSnapshot] = useState<TripStatusSnapshot | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Keep phone state and server state in agreement after crashes, reinstalls or an office "end trip".
  useEffect(() => {
    if (!data) return;
    const serverActive = data.plan?.trip.status === 'active';
    let active = true;
    activeTrip()
      .then(async (local) => {
        if (local && !serverActive) await stopTripTracking();
        if (active) setTracking(!!local && serverActive);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [data]);

  useEffect(() => {
    if (!tracking) return;
    const id = setInterval(async () => {
      const s = await lastStatus();
      setSnapshot(s);
      if (s?.status === 'completed') {
        setTracking(false);
        toast('Trip finished at the last stop. Location sharing stopped.');
        void load();
      }
    }, 3000);
    return () => clearInterval(id);
  }, [tracking, load, toast]);

  const done = useMemo(() => (trips ?? []).filter((t) => t.status === 'completed'), [trips]);

  if (!session || !membership) return <Redirect href="/" />;
  if (membership.role !== 'driver') return <Redirect href="/" />;

  async function start(resume = false) {
    if (!plan) return;
    setPending(true);
    try {
      const problem = await ensureDriverPermissions();
      setPermission(problem);
      if (problem) return;
      if (!resume) {
        const { error: rpcError } = await supabase.rpc('start_trip', { p_trip: plan.trip.id });
        if (rpcError) throw rpcError;
      }
      try {
        await startTripTracking({ tripId: plan.trip.id, busNumber: plan.trip.buses?.number ?? '' });
      } catch (trackingError) {
        // Never leave a trip "live" that this phone can't actually track.
        await supabase.rpc('end_trip', { p_trip: plan.trip.id });
        throw trackingError;
      }
      setTracking(true);
      toast('Location sharing started. You can put the phone away.');
      await load();
    } catch (e) {
      toast(friendlyError(e), 'error');
    } finally {
      setPending(false);
    }
  }

  async function end() {
    if (!plan) return;
    setPending(true);
    try {
      await flushQueue();
      const { error: rpcError } = await supabase.rpc('end_trip', { p_trip: plan.trip.id });
      if (rpcError) throw rpcError;
      await stopTripTracking();
      setTracking(false);
      toast('Trip ended. Location sharing stopped.');
      await load();
    } catch (e) {
      toast(friendlyError(e), 'error');
    } finally {
      setPending(false);
    }
  }

  const header = (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Txt variant="label">Driver · {membership.colleges.name}</Txt>
        <Txt variant="label" color="ink2">{plan ? `Bus ${plan.trip.buses?.number}` : membership.display_name}</Txt>
      </View>
      {membership.colleges.is_demo && <DemoBadge />}
      <Pressable onPress={() => setShowSettings((v) => !v)} accessibilityRole="button" hitSlop={12}>
        <Txt variant="label" color="accentText">{showSettings ? 'Close' : 'Settings'}</Txt>
      </Pressable>
    </View>
  );

  if (showSettings) {
    return (
      <Screen>
        {header}
        <AccountSettings />
      </Screen>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <Screen>
        {header}
        <EmptyState
          icon="bus"
          title="Driving needs the Android app"
          body="Browsers can't share location with the screen off. Install the BusBuddy Android app on the phone that rides in the bus."
        />
      </Screen>
    );
  }

  if (trips === null && !error) {
    return (
      <Screen>
        {header}
        <Skeleton height={60} />
        <Skeleton height={360} rounded={radius.lg} />
      </Screen>
    );
  }

  if (tracking && plan) {
    const next = snapshot?.nextStop;
    const failing = snapshot && !snapshot.ok;
    return (
      <Screen
        scroll={false}
        footer={
          <>
            <HoldButton label="Hold to end trip" onComplete={end} disabled={pending} />
            <Txt variant="label" color="ink2" align="center">Ends automatically at the last stop.</Txt>
          </>
        }
      >
        {header}
        <View style={[styles.sharing, { backgroundColor: colors.board }]} accessibilityLiveRegion="polite">
          <View style={styles.liveRow}>
            <View style={[styles.liveDot, { backgroundColor: failing ? colors.accent : colors.ontime }]} />
            <Txt style={[styles.sharingTitle, { color: '#F3F0E8' }]}>{failing ? 'Waiting for signal' : 'Sharing location'}</Txt>
          </View>
          <Txt variant="label" style={{ color: '#A8A396' }}>
            {plan.trip.routes?.name} · {failing ? `${snapshot?.queued ?? 0} points saved, sending when back online` : 'students can see the bus'}
          </Txt>
        </View>
        <View style={{ gap: space[1] }}>
          <Txt variant="micro" color="ink2">Next stop</Txt>
          <Txt variant="display" numberOfLines={2}>{next?.name ?? 'Finding the bus…'}</Txt>
          {next?.seconds != null && <Txt variant="title" color="ink2">about {minutesFromSeconds(next.seconds)} min</Txt>}
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      onRefresh={load}
      footer={
        plan?.trip.status === 'active' ? (
          <Button label="Resume sharing on this phone" pending={pending} onPress={() => start(true)} />
        ) : undefined
      }
    >
      {header}
      {error && (
        <EmptyState icon="wifiOff" title="Can't load today's trip" body={error} action={<Button label="Try again" variant="secondary" onPress={load} />} />
      )}
      {permission && (
        <EmptyState
          icon="locate"
          title="Location permission needed"
          body={PERMISSION_COPY[permission]}
          action={<Button label="Open settings" variant="secondary" onPress={() => Linking.openSettings()} />}
        />
      )}
      {!error && !plan && (
        <EmptyState
          icon="clock"
          title={done.length ? 'All trips done for today' : 'No trip assigned today'}
          body={done.length ? 'Thank you. Your next trip will show here.' : 'If you should be driving today, ask the transport office to assign you.'}
        />
      )}
      {plan && plan.trip.status === 'scheduled' && (
        <>
          <View style={{ gap: space[1] }}>
            <Txt variant="micro" color="ink2">Today · {plan.trip.period}</Txt>
            <Txt variant="title" style={{ fontSize: 24, lineHeight: 30 }}>
              {plan.trip.routes?.name}, {plan.stopCount} stops. Leave {plan.firstStop}
              {plan.firstTime && plan.firstTime !== '–' ? ` at ${plan.firstTime}` : ''}.
            </Txt>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start trip"
            accessibilityHint="Starts sharing the bus location with students"
            disabled={pending}
            onPress={() => start(false)}
            style={({ pressed }) => [
              styles.start,
              { backgroundColor: colors.accent, borderColor: colors.board, transform: [{ scale: pressed ? 0.98 : 1 }], opacity: pending ? 0.7 : 1 },
            ]}
          >
            <Txt style={[styles.startText, { color: colors.onAccent }]}>{pending ? 'Starting…' : 'Start trip'}</Txt>
            <Txt variant="title" style={{ color: colors.onAccent, fontSize: 18 }}>Starts sharing your location</Txt>
          </Pressable>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  start: {
    minHeight: 320,
    borderRadius: radius.lg,
    borderBottomWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[3],
    padding: space[5],
  },
  startText: { fontFamily: fonts.black, fontSize: 56, lineHeight: 60, letterSpacing: -1.5 },
  sharing: { borderRadius: radius.lg, padding: space[5], gap: space[2] },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  liveDot: { width: 20, height: 20, borderRadius: 10 },
  sharingTitle: { fontFamily: fonts.black, fontSize: 36, lineHeight: 40, letterSpacing: -1 },
});
