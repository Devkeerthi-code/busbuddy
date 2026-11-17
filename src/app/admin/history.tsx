import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pill } from '@/components/ui/Pill';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Txt } from '@/components/ui/Txt';
import { useAsync } from '@/hooks/useAsync';
import { fetchHistory } from '@/lib/admin-data';
import { clockTime, delayLabel } from '@/lib/format';
import type { TripRow } from '@/lib/types';
import { radius, space } from '@/theme/tokens';

const END_REASON: Record<string, string> = {
  last_stop: 'Reached last stop',
  driver: 'Ended by driver',
  no_signal: 'Closed: no signal for 30 min',
  admin: 'Ended by office',
};

function duration(trip: TripRow): string {
  if (!trip.started_at || !trip.ended_at) return '';
  const min = Math.round((new Date(trip.ended_at).getTime() - new Date(trip.started_at).getTime()) / 60_000);
  return `${min} min`;
}

export default function AdminHistory() {
  const load = useCallback(() => fetchHistory(7), []);
  const { data: trips, error, reload } = useAsync(load);

  const byDay = new Map<string, TripRow[]>();
  for (const t of trips ?? []) byDay.set(t.service_date, [...(byDay.get(t.service_date) ?? []), t]);

  return (
    <Screen inTabs onRefresh={reload}>
      <Txt variant="display" accessibilityRole="header">History</Txt>
      <Txt color="ink2">Trips from the last 7 days. GPS trails are deleted after 7 days; arrival times at stops are kept to improve ETAs.</Txt>
      {error && <EmptyState icon="wifiOff" title="Can't load history" body={error} action={<Button label="Try again" variant="secondary" onPress={reload} />} />}
      {trips === null && !error && <Skeleton height={180} rounded={radius.lg} />}
      {trips?.length === 0 && <EmptyState icon="history" title="No trips yet" body="Trips appear here after a driver starts one." />}
      {[...byDay.entries()].map(([day, list]) => (
        <View key={day} style={{ gap: space[2] }}>
          <Txt variant="micro" color="ink2">
            {new Date(`${day}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
          </Txt>
          {list.map((t) => {
            const delay = delayLabel(t.delay_s);
            return (
              <Card key={t.id} style={styles.row}>
                <Txt variant="title" style={{ width: 52 }}>{t.buses?.number}</Txt>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="label" numberOfLines={1}>{t.routes?.name} · {t.period}</Txt>
                  <Txt variant="label" color="ink2" numberOfLines={2}>
                    {t.started_at ? `${clockTime(new Date(t.started_at))}` : ''}
                    {t.ended_at ? `–${clockTime(new Date(t.ended_at))} · ${duration(t)}` : ' · running'}
                    {t.end_reason ? ` · ${END_REASON[t.end_reason] ?? t.end_reason}` : ''}
                  </Txt>
                </View>
                {t.status === 'cancelled' ? <Pill text="Cancelled" tone="late" /> : t.delay_s !== null ? <Pill text={delay.text} tone={delay.tone} /> : null}
              </Card>
            );
          })}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3] },
});
