import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SetupHeader } from '@/components/admin/SetupHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { ListGroup, ListRow } from '@/components/ui/List';
import { Screen } from '@/components/ui/Screen';
import { useToast } from '@/components/ui/Toast';
import { Txt } from '@/components/ui/Txt';
import { fetchMembers, fetchTemplates, WEEKDAYS, type Member, type Template } from '@/lib/admin-data';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

export default function Trips() {
  const { membership } = useAuth();
  const { colors } = useTheme();
  const toast = useToast();
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [drivers, setDrivers] = useState<Member[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!membership) return;
      Promise.all([fetchTemplates(), fetchMembers(membership.college_id)])
        .then(([t, m]) => {
          setTemplates(t);
          setDrivers(m);
        })
        .catch((e) => toast(friendlyError(e), 'error'));
    }, [membership, toast]),
  );

  const driverName = (id: string | null) => drivers.find((d) => d.user_id === id)?.display_name ?? 'No driver';

  return (
    <Screen footer={<Button label="Add a trip" icon="plus" onPress={() => router.push({ pathname: '/admin/setup/trip/[id]', params: { id: 'new' } })} />}>
      <SetupHeader title="Trips" />
      <Txt color="ink2">Each trip repeats on the weekdays you pick. Today’s runs are created automatically.</Txt>
      {templates?.length === 0 && (
        <EmptyState icon="clock" title="No trips yet" body="Add a morning and an evening run for each route, with a bus, a driver and times for each stop." />
      )}
      {templates && templates.length > 0 && (
        <ListGroup>
          {templates.map((t) => (
            <ListRow
              key={t.id}
              onPress={() => router.push({ pathname: '/admin/setup/trip/[id]', params: { id: t.id } })}
              leading={
                <View style={[styles.period, { backgroundColor: t.period === 'morning' ? colors.accent : colors.board }]}>
                  <Icon name={t.period === 'morning' ? 'sun' : 'moon'} size={20} color={t.period === 'morning' ? colors.onAccent : colors.boardInk} />
                </View>
              }
              title={`${t.routes?.name ?? 'Route'} · Bus ${t.buses?.number ?? '?'}`}
              detail={`${driverName(t.driver_id)} · ${t.weekdays.length === 7 ? 'every day' : t.weekdays.map((d) => WEEKDAYS[d]).join(' ')}${t.active ? '' : ' · paused'}`}
              detailColor={t.driver_id ? 'ink2' : 'late'}
            />
          ))}
        </ListGroup>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  period: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
});
