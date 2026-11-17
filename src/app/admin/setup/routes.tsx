import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SetupHeader } from '@/components/admin/SetupHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { ListGroup, ListRow } from '@/components/ui/List';
import { Screen } from '@/components/ui/Screen';
import { useToast } from '@/components/ui/Toast';
import { fetchRouteStopCounts } from '@/lib/admin-data';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { fetchRoutes } from '@/lib/rider-data';
import { supabase } from '@/lib/supabase';
import type { RouteRow } from '@/lib/types';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

export default function RoutesList() {
  const { membership } = useAuth();
  const { colors } = useTheme();
  const toast = useToast();
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);

  useFocusEffect(
    useCallback(() => {
      Promise.all([fetchRoutes(), fetchRouteStopCounts()])
        .then(([r, c]) => {
          setRoutes(r);
          setCounts(c);
        })
        .catch((e) => toast(friendlyError(e), 'error'));
    }, [toast]),
  );

  async function add() {
    const trimmed = name.trim();
    if (!trimmed || !membership) return;
    setPending(true);
    try {
      const { data, error } = await supabase.from('routes').insert({ college_id: membership.college_id, name: trimmed }).select('id').single();
      if (error) throw error;
      setName('');
      router.push({ pathname: '/admin/setup/route/[id]', params: { id: data.id } });
    } catch (e) {
      toast(friendlyError(e), 'error');
    } finally {
      setPending(false);
    }
  }

  return (
    <Screen>
      <SetupHeader title="Routes" />
      <Card style={{ gap: space[3] }}>
        <Field label="New route name" placeholder="e.g. Route C · Lake Road" value={name} onChangeText={setName} maxLength={60} onSubmitEditing={add} />
        <Button label="Add route and place stops" icon="plus" pending={pending} disabled={!name.trim()} onPress={add} />
      </Card>
      {routes.length === 0 && <EmptyState icon="route" title="No routes yet" body="A route is an ordered list of stops. Add one, then tap the map to place its stops in order." />}
      {routes.length > 0 && (
        <ListGroup>
          {routes.map((r) => {
            const n = counts[r.id] ?? 0;
            return (
              <ListRow
                key={r.id}
                onPress={() => router.push({ pathname: '/admin/setup/route/[id]', params: { id: r.id } })}
                leading={
                  <View style={[styles.tile, { backgroundColor: n < 2 ? colors.lateBg : colors.surface2 }]}>
                    <Icon name="route" size={20} color={n < 2 ? colors.late : colors.ink} />
                  </View>
                }
                title={r.name}
                detail={`${n} stops${n < 2 ? ' · needs at least 2' : r.shape_source === 'stops' ? ' · straight lines between stops' : ' · follows real roads'}`}
                detailColor={n < 2 ? 'late' : 'ink2'}
              />
            );
          })}
        </ListGroup>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tile: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
});
