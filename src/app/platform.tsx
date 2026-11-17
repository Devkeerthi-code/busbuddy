import { Redirect, router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DemoBadge } from '@/components/ui/Pill';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Txt } from '@/components/ui/Txt';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { radius, space } from '@/theme/tokens';

type CollegeStats = { id: string; name: string; is_demo: boolean; created_at: string; joined: number; trips: number; alerts: number };

async function loadColleges(): Promise<CollegeStats[]> {
  const [{ data: list, error: e1 }, { data: usage, error: e2 }] = await Promise.all([
    supabase.from('colleges').select('id, name, is_demo, created_at').order('created_at', { ascending: false }),
    supabase.from('usage_daily').select('college_id, metric, count'),
  ]);
  if (e1 || e2) throw e1 ?? e2;
  const sum = (collegeId: string, metric: string) =>
    (usage ?? []).filter((u) => u.college_id === collegeId && u.metric === metric).reduce((a, u) => a + u.count, 0);
  return (list ?? []).map((c) => ({ ...c, joined: sum(c.id, 'member_joined'), trips: sum(c.id, 'trip_completed'), alerts: sum(c.id, 'alert_sent') }));
}

/** Platform admins (ADMIN_EMAILS) see every college with counts only, never people or locations. */
export default function Platform() {
  const { session, isPlatformAdmin, membership, signOut } = useAuth();
  const { data: colleges, error, reload } = useAsync(loadColleges);

  if (!session) return <Redirect href="/sign-in" />;
  if (!isPlatformAdmin) return <Redirect href="/" />;

  return (
    <Screen onRefresh={reload}>
      <Txt variant="display" accessibilityRole="header">All colleges</Txt>
      <Txt color="ink2">Platform view · counts only. {colleges ? `${colleges.length} colleges.` : ''}</Txt>
      {error && <Txt color="late">{error}</Txt>}
      {colleges === null && !error && <Skeleton height={160} rounded={radius.lg} />}
      {colleges?.map((c) => (
        <Card key={c.id} style={{ gap: space[2] }}>
          <View style={styles.row}>
            <Txt variant="label" style={{ fontSize: 17, flex: 1 }}>{c.name}</Txt>
            {c.is_demo && <DemoBadge />}
          </View>
          <Txt variant="label" color="ink2">
            {c.joined} joined · {c.trips} trips completed · {c.alerts} alerts · since {c.created_at.slice(0, 10)}
          </Txt>
        </Card>
      ))}
      {membership ? (
        <Button label="Back to my college" variant="secondary" onPress={() => router.replace('/')} />
      ) : (
        <Button label="Join or set up a college" variant="secondary" onPress={() => router.push('/join')} />
      )}
      <Button label="Sign out" variant="ghost" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: space[2] } });
