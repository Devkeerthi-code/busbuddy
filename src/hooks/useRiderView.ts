import { inTravelOrder, shapeInTravelOrder } from '@core/direction.ts';
import { haversineM } from '@core/geo.ts';
import { buildRoute, type Route } from '@core/route.ts';
import { useCallback, useMemo } from 'react';
import { useAsync } from '@/hooks/useAsync';
import { answerFor, isStale, type Answer } from '@/lib/answer';
import { useLiveTrips, useNow, type LiveTrip } from '@/lib/live';
import { fetchDepartures, fetchRouteGeometry, fetchStopTimes, fetchTodayTrips, type RiderPrefs } from '@/lib/rider-data';
import { clockTime, shortTime } from '@/lib/format';
import type { RouteGeometry, StopGeo, TripRow } from '@/lib/types';

export type TravelStop = StopGeo & { travelSeq: number; travelAlong: number; scheduled: string | null };

export type BusView = {
  trip: TripRow;
  live: LiveTrip;
  answer: Answer;
  stale: boolean;
  stops: TravelStop[];
  myStop: TravelStop | null;
};

const AT_STOP_M = 80;

function viewFor(
  trip: TripRow,
  live: LiveTrip,
  geo: RouteGeometry,
  route: Route,
  stopTimes: Record<string, string>,
  myStopId: string,
  now: number,
  departedAt: string | null,
): BusView {
  const stops: TravelStop[] = inTravelOrder(geo.stops, route.length, trip.period).map((s) => ({
    ...s,
    scheduled: shortTime(stopTimes[s.id]) === '–' ? null : shortTime(stopTimes[s.id]),
  }));
  const myStop = stops.find((s) => s.id === myStopId) ?? null;
  const pos = live.position;
  const doneSeq = pos?.doneSeq ?? trip.done_seq;
  const atMyStop =
    !!myStop && !!pos && live.status === 'active' && doneSeq === myStop.travelSeq &&
    haversineM({ lng: pos.lng, lat: pos.lat }, myStop) < AT_STOP_M;

  const answer = answerFor({
    status: live.status,
    myTravelSeq: myStop?.travelSeq ?? 0,
    doneSeq,
    etas: pos?.etas ?? trip.stop_etas ?? [],
    fixAt: pos?.t ?? null,
    now,
    firstStopTime: stops[0]?.scheduled ?? null,
    departedMyStopAt: departedAt ? clockTime(new Date(departedAt)) : null,
    atMyStop,
  });
  return { trip, live, answer, stale: live.status === 'active' && isStale(pos?.t ?? null, now), stops, myStop };
}

/** Lower is more relevant: a bus on its way to you beats one that hasn't started, which beats one that's done. */
function rank(v: BusView): number {
  switch (v.answer.kind) {
    case 'at_stop':
      return 0;
    case 'on_the_way':
      return 1 + (Number.isFinite(v.answer.seconds) ? v.answer.seconds / 100_000 : 0.5);
    case 'not_started':
      return 3;
    case 'left':
      return 4;
    default:
      return 5;
  }
}

type Loaded = {
  geo: RouteGeometry | null;
  trips: TripRow[];
  stopTimes: Record<string, Record<string, string>>;
  departures: Record<string, Record<number, string | null>>;
};

async function loadRiderData(prefs: RiderPrefs | null): Promise<Loaded | null> {
  if (!prefs) return null;
  const [geo, trips] = await Promise.all([
    fetchRouteGeometry(prefs.routeId),
    fetchTodayTrips({ routeId: prefs.routeId, period: prefs.period }),
  ]);
  const stopTimes = await fetchStopTimes([...new Set(trips.map((x) => x.template_id))]);
  const started = trips.filter((x) => x.status !== 'scheduled');
  const departures = Object.fromEntries(await Promise.all(started.map(async (x) => [x.id, await fetchDepartures(x.id)] as const)));
  return { geo, trips, stopTimes, departures };
}

const NO_TRIPS: TripRow[] = [];

export function useRiderView(prefs: RiderPrefs | null) {
  const load = useCallback(() => loadRiderData(prefs), [prefs]);
  const { data, error, loading, reload } = useAsync(load);
  const now = useNow(1000);
  const geo = data?.geo ?? null;
  const trips = data?.trips ?? NO_TRIPS;
  const live = useLiveTrips(trips, reload);

  const route = useMemo(() => {
    if (!geo?.shape || geo.shape.length < 2) return null;
    return buildRoute(geo.shape.map(([lng, lat]) => ({ lng, lat })));
  }, [geo]);

  const buses = useMemo(() => {
    if (!data || !geo || !route || !prefs) return [];
    return data.trips
      .map((trip) => {
        const myTravel = inTravelOrder(geo.stops, route.length, trip.period).find((s) => s.id === prefs.stopId);
        const departedAt = myTravel ? data.departures[trip.id]?.[myTravel.travelSeq] ?? null : null;
        const liveTrip = live[trip.id] ?? { status: trip.status, position: null };
        return viewFor(trip, liveTrip, geo, route, data.stopTimes[trip.template_id] ?? {}, prefs.stopId, now, departedAt);
      })
      .sort((a, b) => rank(a) - rank(b));
  }, [data, geo, route, prefs, live, now]);

  const travelRoute = useMemo(() => {
    if (!route || !prefs) return null;
    return buildRoute(shapeInTravelOrder(route.points, prefs.period));
  }, [route, prefs]);

  const status: 'loading' | 'ready' | 'error' = data ? 'ready' : loading ? 'loading' : error ? 'error' : 'loading';
  return { status, geo, buses, primary: buses[0] ?? null, travelRoute, reload, now };
}
