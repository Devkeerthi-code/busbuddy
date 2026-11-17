import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SetupHeader } from '@/components/admin/SetupHeader';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Txt } from '@/components/ui/Txt';
import { fetchMembers, fetchRouteStopCounts, fetchTemplates, fetchUsage, type UsageTotals } from '@/lib/admin-data';
import { useAuth } from '@/lib/auth';
import { fetchBuses, fetchRoutes } from '@/lib/rider-data';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

type Step = { key: string; icon: IconName; title: string; detail: string; done: boolean; href: Href };

export default function SetupHome() {
  const { membership } = useAuth();
  const { colors } = useTheme();
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [usage, setUsage] = useState<UsageTotals>({});

  useFocusEffect(
    useCallback(() => {
      if (!membership) return;
      Promise.all([fetchRoutes(), fetchRouteStopCounts(), fetchBuses(), fetchTemplates(), fetchMembers(membership.college_id), fetchUsage(membership.college_id)])
        .then(([routes, stopCounts, buses, templates, members, u]) => {
          const ready = routes.filter((r) => (stopCounts[r.id] ?? 0) >= 2).length;
          const drivers = members.filter((m) => m.role === 'driver').length;
          const riders = members.filter((m) => m.role === 'rider').length;
          setUsage(u);
          setSteps([
            { key: 'routes', icon: 'route', title: 'Routes and stops', detail: routes.length ? `${routes.length} routes, ${ready} with 2+ stops` : 'Add a route and place its stops on the map', done: ready > 0, href: '/admin/setup/routes' },
            { key: 'buses', icon: 'bus', title: 'Buses', detail: buses.length ? `${buses.length} buses` : 'Add bus numbers and seats', done: buses.length > 0, href: '/admin/setup/buses' },
            { key: 'people', icon: 'people', title: 'Drivers and invite codes', detail: `${drivers} drivers · ${riders} students/staff`, done: drivers > 0, href: '/admin/setup/people' },
            { key: 'trips', icon: 'clock', title: 'Daily trips and times', detail: templates.length ? `${templates.length} trips each week` : 'Morning and evening runs with times per stop', done: templates.length > 0, href: '/admin/setup/trips' },
          ]);
        })
        .catch(() => setSteps([]));
    }, [membership]),
  );

  const remaining = steps?.filter((s) => !s.done).length ?? 0;

  return (
    <Screen inTabs>
      <SetupHeader title="Setup" back={false} />
      <Txt color="ink2">
        {steps === null ? 'Checking your setup…' : remaining === 0 ? 'Everything is in place. Share the student code and drivers can start trips.' : `${remaining} step${remaining > 1 ? 's' : ''} left before students can track buses.`}
      </Txt>
      {(steps ?? []).map((s, i) => (
        <Pressable key={s.key} onPress={() => router.push(s.href)} accessibilityRole="button" accessibilityLabel={`${s.title}. ${s.detail}. ${s.done ? 'Done' : 'To do'}`}>
          <Card style={styles.step} highlighted={!s.done && steps?.findIndex((x) => !x.done) === i}>
            <View style={[styles.badge, { backgroundColor: s.done ? colors.ontimeBg : colors.surface2 }]}>
              <Icon name={s.done ? 'check' : s.icon} color={s.done ? colors.ontime : colors.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="label" style={{ fontSize: 17 }}>{s.title}</Txt>
              <Txt variant="label" color="ink2">{s.detail}</Txt>
            </View>
            <Icon name="chevronRight" color={colors.ink2} />
          </Card>
        </Pressable>
      ))}
      <View style={{ gap: space[2] }}>
        <Txt variant="micro" color="ink2">Usage · last 30 days (counts only)</Txt>
        <Card style={styles.usage}>
          {[
            ['People joined', usage.member_joined?.last30 ?? 0],
            ['Trips completed', usage.trip_completed?.last30 ?? 0],
            ['Live map opens', usage.rider_opened_live?.last30 ?? 0],
            ['Arrival alerts', usage.alert_sent?.last30 ?? 0],
          ].map(([label, value]) => (
            <View key={label} style={{ flexBasis: '45%', flexGrow: 1 }}>
              <Txt variant="title" tabular>{value}</Txt>
              <Txt variant="label" color="ink2">{label}</Txt>
            </View>
          ))}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  badge: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  usage: { flexDirection: 'row', flexWrap: 'wrap', gap: space[4] },
});
