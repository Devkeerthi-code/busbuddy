import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { BusCard } from '@/components/rider/BusCard';
import { EtaBoard } from '@/components/rider/EtaBoard';
import { TripQuestion } from '@/components/rider/TripQuestion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { DemoBadge } from '@/components/ui/Pill';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { Txt } from '@/components/ui/Txt';
import { useRiderPrefs } from '@/hooks/useRiderPrefs';
import { useRiderView } from '@/hooks/useRiderView';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { registerForArrivalAlerts } from '@/lib/push';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

export default function RiderHome() {
  const { membership } = useAuth();
  const { ready, prefs, save } = useRiderPrefs();
  const [editing, setEditing] = useState(false);
  const campus = membership?.colleges.campus_name ?? 'Campus';

  if (!ready) {
    return (
      <Screen inTabs>
        <Skeleton height={28} width="60%" />
        <Skeleton height={220} rounded={radius.lg} />
        <Skeleton height={140} rounded={radius.lg} />
      </Screen>
    );
  }

  if (!prefs || editing) {
    return (
      <Screen inTabs>
        <Header title={membership?.colleges.name ?? ''} subtitle={prefs ? 'Change your trip' : 'First time here'} demo={membership?.colleges.is_demo} />
        <Txt variant="display" accessibilityRole="header">Where’s my bus?</Txt>
        <TripQuestion
          campus={campus}
          initial={prefs}
          onSave={async (p) => {
            await save(p);
            setEditing(false);
          }}
        />
        <Txt variant="label" color="ink2">
          Saved on this phone. You won’t see this question again unless you change your stop.
        </Txt>
        {prefs && <Button label="Cancel" variant="ghost" onPress={() => setEditing(false)} />}
      </Screen>
    );
  }

  return <Answer campus={campus} onChangeTrip={() => setEditing(true)} />;
}

function Answer({ campus, onChangeTrip }: { campus: string; onChangeTrip: () => void }) {
  const { membership, session } = useAuth();
  const { prefs, save } = useRiderPrefs();
  const toast = useToast();
  const { status, buses, primary, geo, reload, now } = useRiderView(prefs);
  const [refreshing, setRefreshing] = useState(false);
  const registered = useRef(false);

  // Register this phone for the 5-minute alert once alerts are on (asks permission the first time).
  useEffect(() => {
    if (!prefs?.alerts || !session || registered.current) return;
    registered.current = true;
    void registerForArrivalAlerts(session.user.id);
  }, [prefs?.alerts, session]);

  const myStop = geo?.stops.find((s) => s.id === prefs?.stopId)?.name ?? 'Your stop';
  const [from, to] = prefs?.period === 'evening' ? [campus, myStop] : [myStop, campus];

  async function toggleAlerts(on: boolean) {
    if (!prefs || !session) return;
    try {
      await save({ ...prefs, alerts: on });
      if (on) {
        const result = await registerForArrivalAlerts(session.user.id);
        if (result === 'denied') return toast('Notifications are off for BusBuddy. Turn them on in Settings.', 'error');
        if (result === 'unsupported') return toast('Alerts work in the Android app, not in the browser.', 'info');
      }
      toast(on ? "We'll ping you once when the bus is 5 min away" : 'Arrival alert turned off');
    } catch (e) {
      toast(friendlyError(e), 'error');
    }
  }

  return (
    <Screen
      inTabs
      onRefresh={async () => {
        setRefreshing(true);
        await reload();
        setRefreshing(false);
      }}
      refreshing={refreshing}
    >
      <Header
        title={`${from} → ${to}`}
        subtitle={`${prefs?.period === 'evening' ? 'Evening' : 'Morning'} · ${geo?.name ?? ''}`}
        demo={membership?.colleges.is_demo}
      />

      {status === 'loading' && <Skeleton height={230} rounded={radius.lg} />}
      {status === 'error' && (
        <EmptyState
          icon="wifiOff"
          title="Can't reach BusBuddy"
          body="You're offline or the network is slow. Your stop is saved; pull down to try again."
          action={<Button label="Try again" variant="secondary" icon="refresh" onPress={reload} />}
        />
      )}
      {status === 'ready' && !primary && (
        <EmptyState
          icon="clock"
          title={`No ${prefs?.period ?? ''} bus today`}
          body="There's no trip scheduled on this route for this time today. Check with your transport office if that's unexpected."
        />
      )}
      {primary && (
        <Pressable onPress={() => router.push('/rider/map')} accessibilityRole="button" accessibilityHint="Opens the live map">
          <EtaBoard view={primary} now={now} campus={campus} />
        </Pressable>
      )}

      {buses.length > 0 && (
        <View style={{ gap: space[3] }}>
          <View style={styles.sectionHead}>
            <Txt variant="micro" color="ink2">Buses on this route today</Txt>
            <Pressable onPress={() => router.push('/rider/map')} accessibilityRole="link" hitSlop={12}>
              <Txt variant="label" color="accentText">Open map</Txt>
            </Pressable>
          </View>
          {buses.map((b, i) => (
            <BusCard key={b.trip.id} view={b} now={now} highlighted={i === 0} onPress={() => router.push('/rider/map')} />
          ))}
        </View>
      )}

      <Card style={{ gap: space[1], paddingVertical: space[2] }}>
        <ServiceRow icon="bell" title="Alert at 5 minutes" detail="One notification per trip, never more">
          <Switch
            value={prefs?.alerts ?? false}
            onValueChange={toggleAlerts}
            accessibilityLabel="Alert me when the bus is 5 minutes away"
          />
        </ServiceRow>
        <ServiceRow icon="route" title="Change stop or route" detail={`${myStop} · ${geo?.name ?? ''}`} onPress={onChangeTrip} />
      </Card>
    </Screen>
  );
}

function Header({ title, subtitle, demo }: { title: string; subtitle: string; demo?: boolean }) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Txt variant="label" numberOfLines={1}>{title}</Txt>
        <Txt variant="label" color="ink2" numberOfLines={1}>{subtitle}</Txt>
      </View>
      {demo && <DemoBadge />}
    </View>
  );
}

function ServiceRow({ icon, title, detail, children, onPress }: {
  icon: 'bell' | 'route';
  title: string;
  detail: string;
  children?: React.ReactNode;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={styles.service}
    >
      <View style={[styles.serviceIcon, { backgroundColor: colors.surface2 }]}>
        <Icon name={icon} size={20} color={colors.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt variant="label">{title}</Txt>
        <Txt variant="label" color="ink2" numberOfLines={1} style={{ fontSize: 13 }}>{detail}</Txt>
      </View>
      {children ?? <Icon name="chevronRight" size={20} color={colors.ink2} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  service: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 60 },
  serviceIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
