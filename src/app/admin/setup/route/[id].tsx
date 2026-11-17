import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SetupHeader } from '@/components/admin/SetupHeader';
import { BusMap } from '@/components/map/BusMap';
import type { Coord, MapStop } from '@/components/map/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { useToast } from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/Skeleton';
import { Txt } from '@/components/ui/Txt';
import { useAsync } from '@/hooks/useAsync';
import { friendlyError } from '@/lib/errors';
import { fetchRouteGeometry } from '@/lib/rider-data';
import { supabase } from '@/lib/supabase';
import type { RouteGeometry } from '@/lib/types';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space, tap } from '@/theme/tokens';

type DraftStop = { key: string; id?: string; name: string; lng: number; lat: number };
type RecordedTrip = { id: string; service_date: string; period: string };

let draftCounter = 0;
const nextKey = () => `new-${++draftCounter}`;

async function loadRoute(id: string): Promise<{ geo: RouteGeometry | null; recorded: RecordedTrip[]; version: number }> {
  const geo = await fetchRouteGeometry(id, true);
  const { data } = await supabase
    .from('trips')
    .select('id, service_date, period')
    .eq('route_id', id)
    .eq('status', 'completed')
    .order('service_date', { ascending: false })
    .limit(5);
  return { geo, recorded: data ?? [], version: Date.now() };
}

export default function RouteEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const load = useCallback(() => loadRoute(id), [id]);
  const { data, error, reload } = useAsync(load);
  if (!data) {
    return (
      <Screen>
        <SetupHeader title="Route" />
        {error ? <Txt color="late">{error}</Txt> : <Skeleton height={340} rounded={radius.lg} />}
      </Screen>
    );
  }
  // Remount the editor after each save so the draft starts from what the database now holds.
  return <RouteEditor key={data.version} id={id} geo={data.geo} recorded={data.recorded} reload={reload} />;
}

type EditorProps = { id: string; geo: RouteGeometry | null; recorded: RecordedTrip[]; reload: () => Promise<void> };

function RouteEditor({ id, geo, recorded, reload }: EditorProps) {
  const { colors } = useTheme();
  const toast = useToast();
  const [stops, setStops] = useState<DraftStop[]>(() =>
    (geo?.stops ?? []).map((s) => ({ key: s.id, id: s.id, name: s.name, lng: s.lng, lat: s.lat })),
  );
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);

  const update = (next: DraftStop[]) => {
    setStops(next);
    setDirty(true);
  };

  const mapStops = useMemo<MapStop[]>(
    () => stops.map((s, i) => ({ id: s.key, coord: [s.lng, s.lat], name: `${i + 1}. ${s.name}`, state: 'upcoming' })),
    [stops],
  );
  const draftLine = useMemo<Coord[]>(() => stops.map((s) => [s.lng, s.lat]), [stops]);
  const shape = !dirty && geo?.shape ? (geo.shape as Coord[]) : draftLine;
  const fit = useMemo<Coord[]>(
    () => (geo?.shape?.length ? (geo.shape as Coord[]) : (geo?.stops ?? []).map((s) => [s.lng, s.lat] as Coord)),
    [geo],
  );

  async function save() {
    if (stops.some((s) => !s.name.trim())) return toast('Every stop needs a name.', 'error');
    setPending(true);
    try {
      const payload = stops.map((s) => ({ id: s.id ?? null, name: s.name.trim(), lng: s.lng, lat: s.lat }));
      const { error } = await supabase.rpc('save_route_stops', { p_route: id, p_stops: payload });
      if (error) throw error;
      toast(`Saved ${stops.length} stops`);
      await reload();
    } catch (e) {
      toast(friendlyError(e), 'error');
    } finally {
      setPending(false);
    }
  }

  async function applyTripShape(tripId: string) {
    setPending(true);
    try {
      const { error } = await supabase.rpc('set_route_shape_from_trip', { p_trip: tripId });
      if (error) throw error;
      toast('Route now follows the road this bus actually drove');
      await reload();
    } catch (e) {
      toast(friendlyError(e), 'error');
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    setPending(true);
    const { error } = await supabase.from('routes').delete().eq('id', id);
    setPending(false);
    if (error) return toast(friendlyError(error), 'error');
    toast('Route deleted');
    router.back();
  }

  const move = (i: number, by: number) => {
    const j = i + by;
    if (j < 0 || j >= stops.length) return;
    const next = [...stops];
    [next[i], next[j]] = [next[j], next[i]];
    update(next);
  };

  return (
    <Screen footer={<Button label={dirty ? 'Save stops' : 'Saved'} pending={pending} disabled={!dirty} onPress={save} />}>
      <SetupHeader title={geo?.name ?? 'Route'} />
      <Txt color="ink2">Tap the map to add the next stop in the order the morning bus reaches them. Drag the map to move around.</Txt>
      <View style={[styles.map, { borderColor: colors.line }]}>
        <BusMap
          accessibilityLabel="Route map. Tap to add a stop."
          shape={shape}
          stops={mapStops}
          fit={fit}
          onPress={([lng, lat]) => update([...stops, { key: nextKey(), name: `Stop ${stops.length + 1}`, lng, lat }])}
        />
      </View>

      {stops.map((s, i) => (
        <Card key={s.key} style={styles.stopRow}>
          <Txt variant="title" tabular style={{ width: 28 }}>{i + 1}</Txt>
          <TextInput
            value={s.name}
            onChangeText={(name) => update(stops.map((x) => (x.key === s.key ? { ...x, name } : x)))}
            accessibilityLabel={`Name of stop ${i + 1}`}
            maxLength={60}
            style={[styles.nameInput, { color: colors.ink, borderColor: colors.line }]}
          />
          <IconButton icon="arrowUp" label="Move up" onPress={() => move(i, -1)} disabled={i === 0} />
          <IconButton icon="arrowDown" label="Move down" onPress={() => move(i, 1)} disabled={i === stops.length - 1} />
          <IconButton icon="trash" label={`Delete ${s.name}`} onPress={() => update(stops.filter((x) => x.key !== s.key))} />
        </Card>
      ))}

      {recorded.length > 0 && (
        <Card style={{ gap: space[3] }}>
          <Txt variant="label" style={{ fontSize: 17 }}>Follow the real road</Txt>
          <Txt variant="label" color="ink2">
            Use the path a bus actually drove as this route’s shape. ETAs get more accurate on curvy roads. Stops stay as they are.
          </Txt>
          {recorded.map((t) => (
            <Button key={t.id} variant="secondary" label={`Use ${t.period} trip of ${t.service_date}`} pending={pending} onPress={() => applyTripShape(t.id)} />
          ))}
        </Card>
      )}
      <Button label="Delete this route" variant="danger" onPress={remove} pending={pending} />
    </Screen>
  );
}

function IconButton({ icon, label, onPress, disabled }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={disabled} style={[styles.iconBtn, { opacity: disabled ? 0.3 : 1 }]}>
      <Icon name={icon} size={20} color={colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  map: { height: 340, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1.5 },
  stopRow: { flexDirection: 'row', alignItems: 'center', gap: space[1], paddingVertical: space[2] },
  nameInput: { flex: 1, minHeight: tap.min, borderBottomWidth: 1.5, fontFamily: fonts.semibold, fontSize: 16, paddingHorizontal: space[2] },
  iconBtn: { width: 40, height: tap.min, alignItems: 'center', justifyContent: 'center' },
});
