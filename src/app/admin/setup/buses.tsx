import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';
import { SetupHeader } from '@/components/admin/SetupHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field } from '@/components/ui/Field';
import { ListGroup, ListRow } from '@/components/ui/List';
import { Plate } from '@/components/ui/Plate';
import { Screen } from '@/components/ui/Screen';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { fetchBuses } from '@/lib/rider-data';
import { supabase } from '@/lib/supabase';
import type { Bus } from '@/lib/types';
import { space } from '@/theme/tokens';

const schema = z.object({
  number: z.string().trim().min(1, 'Add the number painted on the bus.').max(12, 'Keep it under 12 characters.'),
  capacity: z.coerce.number().int('Whole number of seats.').min(1, 'At least 1 seat.').max(120, 'At most 120 seats.'),
});

export default function Buses() {
  const { membership } = useAuth();
  const toast = useToast();
  const [buses, setBuses] = useState<Bus[] | null>(null);
  const [number, setNumber] = useState('');
  const [capacity, setCapacity] = useState('');
  const [errors, setErrors] = useState<{ number?: string; capacity?: string }>({});
  const [pending, setPending] = useState(false);

  const load = useCallback(() => fetchBuses().then(setBuses).catch((e) => toast(friendlyError(e), 'error')), [toast]);
  useEffect(() => {
    void load();
  }, [load]);

  async function add() {
    const parsed = schema.safeParse({ number, capacity });
    if (!parsed.success) {
      const flat = z.flattenError(parsed.error).fieldErrors;
      return setErrors({ number: flat.number?.[0], capacity: flat.capacity?.[0] });
    }
    setErrors({});
    setPending(true);
    try {
      const { error } = await supabase.from('buses').insert({ college_id: membership!.college_id, ...parsed.data });
      if (error) throw error;
      setNumber('');
      setCapacity('');
      toast(`Bus ${parsed.data.number} added`);
      await load();
    } catch (e) {
      toast(friendlyError(e), 'error');
    } finally {
      setPending(false);
    }
  }

  async function remove(bus: Bus) {
    const { error } = await supabase.from('buses').delete().eq('id', bus.id);
    if (error) return toast(friendlyError(error), 'error');
    toast(`Bus ${bus.number} removed, with its trips`);
    await load();
  }

  return (
    <Screen>
      <SetupHeader title="Buses" />
      <Card style={{ gap: space[3] }}>
        <View style={styles.formRow}>
          <View style={{ flex: 1 }}>
            <Field label="Bus number" placeholder="12" value={number} onChangeText={setNumber} autoCapitalize="characters" error={errors.number} />
          </View>
          <View style={{ width: 120 }}>
            <Field label="Seats" placeholder="52" value={capacity} onChangeText={setCapacity} keyboardType="number-pad" error={errors.capacity} />
          </View>
        </View>
        <Button label="Add bus" icon="plus" pending={pending} onPress={add} />
      </Card>
      {buses?.length === 0 && <EmptyState icon="bus" title="No buses yet" body="Add each bus by the number students see on it." />}
      {buses && buses.length > 0 && (
        <ListGroup>
          {buses.map((b) => (
            <ListRow
              key={b.id}
              leading={<Plate number={b.number} />}
              title={`Bus ${b.number}`}
              detail={`${b.capacity} seats`}
              trailing={<Button label="Remove" variant="ghost" onPress={() => remove(b)} accessibilityHint={`Removes bus ${b.number} and its trips`} />}
            />
          ))}
        </ListGroup>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  formRow: { flexDirection: 'row', gap: space[3] },
});
