import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from './supabase';
import type { LivePosition, TripRow, TripStatus } from './types';

export type LiveTrip = { status: TripStatus; position: LivePosition | null };

function fromRow(row: TripRow): LiveTrip {
  const position: LivePosition | null =
    row.last_fix_at && row.last_lng !== null && row.last_lat !== null
      ? {
          tripId: row.id,
          lng: row.last_lng,
          lat: row.last_lat,
          t: new Date(row.last_fix_at).getTime(),
          progress: row.progress_m,
          speed: row.speed_mps,
          delaySec: row.delay_s,
          doneSeq: row.done_seq,
          etas: row.stop_etas ?? [],
          offRoute: row.off_route,
        }
      : null;
  return { status: row.status, position };
}

/** Newest wins: a broadcast can be ahead of the last database read, or behind a fresh refetch. */
function merge(fromDb: LiveTrip, pushed: Partial<LiveTrip> | undefined): LiveTrip {
  if (!pushed) return fromDb;
  const position =
    pushed.position && (!fromDb.position || pushed.position.t > fromDb.position.t) ? pushed.position : fromDb.position;
  const status = pushed.status && fromDb.status !== 'completed' && fromDb.status !== 'cancelled' ? pushed.status : fromDb.status;
  return { status, position };
}

/**
 * Live state for a set of trips: the database rows, overlaid with what arrives on the private
 * Realtime channels ("trip:<id>", or "college:<id>" for the admin fleet view). `refetch` also
 * runs on a slow timer as a safety net when a mobile websocket drops silently.
 */
export function useLiveTrips(rows: TripRow[], refetch: () => void, topic: 'trip' | 'college' = 'trip', collegeId?: string) {
  const [pushed, setPushed] = useState<Record<string, Partial<LiveTrip>>>({});
  const refetchRef = useRef(refetch);
  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  const ids = rows.map((r) => r.id).sort().join(',');

  useEffect(() => {
    if (!ids) return;
    let cancelled = false;
    const wanted = new Set(ids.split(','));
    const topics = topic === 'college' && collegeId ? [`college:${collegeId}`] : [...wanted].map((id) => `trip:${id}`);
    const channels = topics.map((name) =>
      supabase
        .channel(name, { config: { private: true } })
        .on('broadcast', { event: 'position' }, ({ payload }) => {
          const p = payload as LivePosition;
          if (wanted.has(p.tripId)) setPushed((prev) => ({ ...prev, [p.tripId]: { status: 'active', position: p } }));
        })
        .on('broadcast', { event: 'status' }, ({ payload }) => {
          const { tripId, status } = payload as { tripId: string; status: TripStatus };
          if (!wanted.has(tripId)) return;
          setPushed((prev) => ({ ...prev, [tripId]: { ...prev[tripId], status } }));
          refetchRef.current();
        }),
    );
    supabase.realtime.setAuth().then(() => {
      if (!cancelled) channels.forEach((c) => c.subscribe());
    });
    const poll = setInterval(() => refetchRef.current(), 30_000);
    return () => {
      cancelled = true;
      clearInterval(poll);
      channels.forEach((c) => supabase.removeChannel(c));
    };
  }, [ids, topic, collegeId]);

  return useMemo(() => {
    const out: Record<string, LiveTrip> = {};
    for (const row of rows) out[row.id] = merge(fromRow(row), pushed[row.id]);
    return out;
  }, [rows, pushed]);
}

/** Re-renders every `ms` so "updated 40 s ago" and countdowns stay honest. */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
