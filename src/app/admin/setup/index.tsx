import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SetupHeader } from '@/components/admin/SetupHeader';
import { Icon, type IconName } from '@/components/ui/Icon';
import { ListGroup, ListRow } from '@/components/ui/List';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
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
      {steps === null ? (
        <Skeleton height={280} rounded={radius.lg} />
      ) : (
        <ListGroup>
          {steps.map((s, i) => {
            const next = !s.done && steps.findIndex((x) => !x.done) === i;
            return (
              <ListRow
                key={s.key}
                onPress={() => router.push(s.href)}
                accessibilityLabel={`Step ${i + 1}: ${s.title}. ${s.detail}. ${s.done ? 'Done' : 'To do'}`}
                highlighted={next}
                leading={
                  <View style={[styles.badge, { backgroundColor: s.done ? colors.ontimeBg : next ? colors.accent : colors.surface2 }]}>
                    {s.done ? (
                      <Icon name="check" size={20} color={colors.ontime} />
                    ) : (
                      <Txt variant="label" tabular style={{ fontSize: 17, color: next ? colors.onAccent : colors.ink }}>{i + 1}</Txt>
                    )}
                  </View>
                }
                title={s.title}
                detail={s.detail}
              />
            );
          })}
        </ListGroup>
      )}
      <View style={{ gap: space[2] }}>
        <Txt variant="micro" color="ink2">Usage · last 30 days (counts only)</Txt>
        <View style={[styles.usage, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          {[
            ['People joined', usage.member_joined?.last30 ?? 0],
            ['Trips completed', usage.trip_completed?.last30 ?? 0],
            ['Live map opens', usage.rider_opened_live?.last30 ?? 0],
            ['Arrival alerts', usage.alert_sent?.last30 ?? 0],
          ].map(([label, value]) => (
            <View key={label} style={styles.usageCell} accessible accessibilityLabel={`${value} ${label}`}>
              <Txt variant="display" tabular style={styles.usageValue}>{value}</Txt>
              <Txt variant="label" color="ink2">{label}</Txt>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  usage: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: radius.lg, borderWidth: 1.5, paddingVertical: space[2] },
  usageCell: { flexBasis: '50%', flexGrow: 1, minWidth: 140, gap: 2, paddingHorizontal: space[4], paddingVertical: space[3] },
  usageValue: { fontSize: 32, lineHeight: 36, letterSpacing: -1 },
});
