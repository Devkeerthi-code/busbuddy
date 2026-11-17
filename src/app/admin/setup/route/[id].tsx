import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SetupHeader } from '@/components/admin/SetupHeader';
import { BusMap } from '@/components/map/BusMap';
import type { Coord, MapStop } from '@/components/map/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
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
        <View pointerEvents="none" style={[styles.mapHint, { backgroundColor: colors.board }]}>
          <Icon name="plus" size={16} color={colors.boardInk} />
          <Txt variant="label" style={{ color: colors.boardText }}>Tap to add stop {stops.length + 1}</Txt>
        </View>
      </View>

      <View style={styles.listHead} accessibilityLiveRegion="polite">
        <Txt variant="micro" color="ink2" style={{ flex: 1 }}>
          {stops.length} {stops.length === 1 ? 'stop' : 'stops'} · in travel order
        </Txt>
        <View style={[styles.saveDot, { backgroundColor: dirty ? colors.accent : colors.ontime }]} />
        <Txt variant="label" color={dirty ? 'accentText' : 'ink2'}>{dirty ? 'Unsaved changes' : 'Saved'}</Txt>
      </View>

      {stops.length === 0 ? (
        <EmptyState icon="route" title="No stops yet" body="Tap the map where the bus first picks people up, then each stop after it. A route needs at least 2 stops." />
      ) : (
        <View style={[styles.stopList, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          {stops.map((s, i) => (
            <StopRow
              key={s.key}
              index={i}
              count={stops.length}
              name={s.name}
              onRename={(name) => update(stops.map((x) => (x.key === s.key ? { ...x, name } : x)))}
              onMove={(by) => move(i, by)}
              onDelete={() => update(stops.filter((x) => x.key !== s.key))}
            />
          ))}
        </View>
      )}

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

type StopRowProps = {
  index: number;
  count: number;
  name: string;
  onRename: (name: string) => void;
  onMove: (by: number) => void;
  onDelete: () => void;
};

/** One stop on the rail: number marker, editable name, reorder and delete. */
function StopRow({ index, count, name, onRename, onMove, onDelete }: StopRowProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const end = index === 0 || index === count - 1;
  return (
    <View style={styles.stopRow}>
      <View style={styles.rail}>
        <View style={[styles.railLine, { backgroundColor: index === 0 ? 'transparent' : colors.line }]} />
        <View style={[styles.stopNum, { backgroundColor: end ? colors.ink : colors.surface, borderColor: colors.ink }]}>
          <Txt tabular style={[styles.stopNumText, { color: end ? colors.bg : colors.ink }]}>{index + 1}</Txt>
        </View>
        <View style={[styles.railLine, { backgroundColor: index === count - 1 ? 'transparent' : colors.line }]} />
      </View>
      <TextInput
        value={name}
        onChangeText={onRename}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={`Name of stop ${index + 1}`}
        maxLength={60}
        selectionColor={colors.accent}
        style={[
          styles.nameInput,
          { color: colors.ink, borderColor: focused ? colors.ink : 'transparent', backgroundColor: focused ? colors.surface : colors.surface2 },
        ]}
      />
      <IconButton icon="arrowUp" label={`Move ${name} up`} onPress={() => onMove(-1)} disabled={index === 0} />
      <IconButton icon="arrowDown" label={`Move ${name} down`} onPress={() => onMove(1)} disabled={index === count - 1} />
      <IconButton icon="trash" label={`Delete ${name}`} onPress={onDelete} danger />
    </View>
  );
}

type IconButtonProps = { icon: IconName; label: string; onPress: () => void; disabled?: boolean; danger?: boolean };

function IconButton({ icon, label, onPress, disabled, danger }: IconButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.iconBtn, { opacity: disabled ? 0.25 : 1, backgroundColor: pressed ? colors.surface2 : 'transparent' }]}
    >
      <Icon name={icon} size={20} color={danger ? colors.late : colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  map: { height: 360, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1.5 },
  mapHint: {
    position: 'absolute',
    top: space[3],
    left: space[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[3],
    paddingVertical: space[1],
    borderRadius: radius.pill,
  },
  listHead: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginBottom: -space[2] },
  saveDot: { width: 8, height: 8, borderRadius: 4 },
  stopList: { borderRadius: radius.lg, borderWidth: 1.5, paddingHorizontal: space[2] },
  stopRow: { flexDirection: 'row', alignItems: 'center', minHeight: 60 },
  rail: { width: 32, alignSelf: 'stretch', alignItems: 'center' },
  railLine: { width: 3, flex: 1 },
  stopNum: { width: 28, height: 28, borderRadius: 14, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  stopNumText: { fontFamily: fonts.black, fontSize: 13, lineHeight: 16 },
  nameInput: {
    flex: 1,
    minWidth: 0,
    minHeight: tap.min,
    borderWidth: 2,
    borderRadius: radius.md,
    fontFamily: fonts.semibold,
    fontSize: 16,
    paddingHorizontal: space[3],
    marginHorizontal: space[1],
  },
  iconBtn: { width: tap.min, height: tap.min, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
