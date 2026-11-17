import { inTravelOrder } from '@core/direction.ts';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SetupHeader } from '@/components/admin/SetupHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Picker } from '@/components/ui/Picker';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { useToast } from '@/components/ui/Toast';
import { Txt } from '@/components/ui/Txt';
import { fetchMembers, suggestTimes, TIME_PATTERN, WEEKDAYS, type Member, type StopTimeDraft } from '@/lib/admin-data';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { shortTime } from '@/lib/format';
import { fetchBuses, fetchRouteGeometry, fetchRoutes, fetchStopTimes } from '@/lib/rider-data';
import { supabase } from '@/lib/supabase';
import type { Bus, Period, RouteGeometry, RouteRow } from '@/lib/types';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space, tap } from '@/theme/tokens';

export default function TripEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { membership } = useAuth();
  const { colors } = useTheme();
  const toast = useToast();
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [drivers, setDrivers] = useState<Member[]>([]);
  const [routeId, setRouteId] = useState<string | null>(null);
  const [busId, setBusId] = useState<string | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('morning');
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [active, setActive] = useState(true);
  const [geo, setGeo] = useState<RouteGeometry | null>(null);
  const [start, setStart] = useState('07:00');
  const [times, setTimes] = useState<StopTimeDraft[]>([]);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!membership) return;
    Promise.all([fetchRoutes(), fetchBuses(), fetchMembers(membership.college_id)])
      .then(([r, b, m]) => {
        setRoutes(r);
        setBuses(b);
        setDrivers(m.filter((x) => x.role === 'driver'));
      })
      .catch((e) => toast(friendlyError(e), 'error'));
    if (isNew) return;
    supabase
      .from('trip_templates')
      .select('route_id, bus_id, driver_id, period, weekdays, active')
      .eq('id', id)
      .single()
      .then(async ({ data, error }) => {
        if (error || !data) return toast(friendlyError(error), 'error');
        setRouteId(data.route_id);
        setBusId(data.bus_id);
        setDriverId(data.driver_id);
        setPeriod(data.period);
        setWeekdays(data.weekdays);
        setActive(data.active);
        const g = await fetchRouteGeometry(data.route_id, true);
        setGeo(g);
        const saved = (await fetchStopTimes([id]))[id] ?? {};
        const ordered = g ? inTravelOrder(g.stops, Math.max(0, ...g.stops.map((s) => s.along)), data.period) : [];
        setTimes(ordered.map((s) => ({ stopId: s.id, name: s.name, time: shortTime(saved[s.id]) === '–' ? '' : shortTime(saved[s.id]) })));
        if (ordered[0] && saved[ordered[0].id]) setStart(shortTime(saved[ordered[0].id]));
      });
  }, [id, isNew, membership, toast]);

  async function chooseRoute(next: string) {
    setRouteId(next);
    const g = await fetchRouteGeometry(next, true).catch(() => null);
    setGeo(g);
    suggest(g, period, start);
  }

  function suggest(g = geo, p = period, s = start) {
    if (!g || !TIME_PATTERN.test(s)) return;
    const length = Math.max(0, ...g.stops.map((x) => x.along));
    const ordered = inTravelOrder(g.stops, length, p).map((x) => ({ id: x.id, name: x.name, along: x.travelAlong }));
    setTimes(suggestTimes(s, ordered));
  }

  async function save() {
    if (!routeId || !busId) return toast('Choose a route and a bus.', 'error');
    if (weekdays.length === 0) return toast('Pick at least one weekday.', 'error');
    if (times.length < 2) return toast('This route needs at least 2 stops first.', 'error');
    if (times.some((t) => !TIME_PATTERN.test(t.time))) return toast('Use 24-hour times like 07:05 for every stop.', 'error');
    setPending(true);
    try {
      const fields = { route_id: routeId, bus_id: busId, driver_id: driverId, period, weekdays, active };
      let templateId = id;
      if (isNew) {
        const { data, error } = await supabase.from('trip_templates').insert({ college_id: membership!.college_id, ...fields }).select('id').single();
        if (error) throw error;
        templateId = data.id;
      } else {
        const { error } = await supabase.from('trip_templates').update(fields).eq('id', id);
        if (error) throw error;
        // Today's run may already exist: keep its bus and driver in sync if it hasn't started.
        await supabase.from('trips').update({ driver_id: driverId, bus_id: busId }).eq('template_id', id).eq('status', 'scheduled');
      }
      await supabase.from('template_stop_times').delete().eq('template_id', templateId);
      const { error: timesError } = await supabase
        .from('template_stop_times')
        .insert(times.map((t) => ({ template_id: templateId, stop_id: t.stopId, scheduled_time: t.time })));
      if (timesError) throw timesError;
      toast('Trip saved');
      router.back();
    } catch (e) {
      toast(friendlyError(e), 'error');
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    const { error } = await supabase.from('trip_templates').delete().eq('id', id);
    if (error) return toast(friendlyError(error), 'error');
    toast('Trip deleted');
    router.back();
  }

  return (
    <Screen footer={<Button label="Save trip" pending={pending} onPress={save} />}>
      <SetupHeader title={isNew ? 'New trip' : 'Edit trip'} />
      <Card style={{ gap: space[4] }}>
        <Segmented
          accessibilityLabel="Morning or evening"
          value={period}
          onChange={(p) => {
            setPeriod(p);
            suggest(geo, p, start);
          }}
          options={[
            { value: 'morning', label: 'Morning · to campus', icon: 'sun' },
            { value: 'evening', label: 'Evening · home', icon: 'moon' },
          ]}
        />
        <Picker label="Route" placeholder="Choose a route" value={routeId} options={routes.map((r) => ({ value: r.id, label: r.name }))} onChange={chooseRoute} />
        <Picker label="Bus" placeholder="Choose a bus" value={busId} options={buses.map((b) => ({ value: b.id, label: `Bus ${b.number}`, detail: `${b.capacity} seats` }))} onChange={setBusId} />
        <Picker
          label="Driver"
          placeholder={drivers.length ? 'Choose a driver' : 'No drivers have joined yet'}
          value={driverId}
          options={drivers.map((d) => ({ value: d.user_id, label: d.display_name }))}
          onChange={setDriverId}
          disabled={drivers.length === 0}
        />
        <View style={{ gap: space[2] }}>
          <Txt variant="label" color="ink2">Runs on</Txt>
          <View style={styles.days}>
            {WEEKDAYS.map((d, i) => {
              const on = weekdays.includes(i);
              return (
                <Pressable
                  key={d}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={d}
                  onPress={() => setWeekdays(on ? weekdays.filter((x) => x !== i) : [...weekdays, i].sort())}
                  style={[styles.day, { backgroundColor: on ? colors.accent : colors.surface2 }]}
                >
                  <Txt variant="label" style={{ color: on ? colors.onAccent : colors.ink2 }}>{d}</Txt>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.activeRow}>
          <Txt variant="label" style={{ flex: 1 }}>Running (turn off for holidays)</Txt>
          <Switch value={active} onValueChange={setActive} accessibilityLabel="Trip is running" />
        </View>
      </Card>

      <Card style={{ gap: space[3] }}>
        <View style={styles.startRow}>
          <View style={{ flex: 1 }}>
            <Field label="Leaves first stop at" value={start} onChangeText={setStart} placeholder="07:00" keyboardType="numbers-and-punctuation" maxLength={5} />
          </View>
          <Button label="Fill times" variant="secondary" onPress={() => suggest()} disabled={!geo} />
        </View>
        <Txt variant="label" color="ink2">Times are filled from distance at a typical 22 km/h. Adjust any stop by hand.</Txt>
        {times.map((t, i) => (
          <View key={t.stopId} style={[styles.timeRow, { borderColor: colors.line }]}>
            <Txt variant="label" tabular color="ink2" style={{ width: 24 }}>{i + 1}</Txt>
            <Txt variant="label" style={{ flex: 1 }} numberOfLines={1}>{t.name}</Txt>
            <TextInput
              value={t.time}
              onChangeText={(time) => setTimes(times.map((x) => (x.stopId === t.stopId ? { ...x, time } : x)))}
              accessibilityLabel={`Time at ${t.name}`}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              style={[styles.timeInput, { color: colors.ink, borderColor: TIME_PATTERN.test(t.time) ? colors.line : colors.late }]}
            />
          </View>
        ))}
      </Card>
      {!isNew && <Button label="Delete this trip" variant="danger" onPress={remove} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  day: { minWidth: 48, height: tap.min, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  startRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space[3] },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], borderBottomWidth: 1, minHeight: 52 },
  timeInput: { width: 80, height: tap.min, borderWidth: 2, borderRadius: radius.sm, textAlign: 'center', fontFamily: fonts.bold, fontSize: 17 },
});
