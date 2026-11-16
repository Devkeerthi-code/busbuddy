import type { StopEta } from './eta.ts';

export const ALERT_THRESHOLD_SECONDS = 5 * 60;

/** Stops whose ETA has crossed the "about 5 minutes away" line. */
export function stopsDueForAlert(etas: StopEta[], threshold = ALERT_THRESHOLD_SECONDS): number[] {
  return etas.filter((e) => e.seconds <= threshold).map((e) => e.seq);
}

export type AlertKey = { tripId: string; userId: string; kind: string };

export const alertKey = (k: AlertKey) => `${k.tripId}:${k.userId}:${k.kind}`;

/**
 * Client-side mirror of the database's UNIQUE(trip_id, user_id, kind) rule:
 * returns only candidates that were not already sent (and no duplicates within the batch).
 * The database constraint is the real guarantee; this keeps the function cheap.
 */
export function newAlerts(alreadySent: Iterable<AlertKey>, candidates: AlertKey[]): AlertKey[] {
  const seen = new Set(Array.from(alreadySent, alertKey));
  const out: AlertKey[] = [];
  for (const c of candidates) {
    const key = alertKey(c);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

export function alertMessage(busNumber: string, stopName: string, seconds: number): { title: string; body: string } {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return {
    title: `Bus ${busNumber} is about ${minutes} min away`,
    body: `Head to ${stopName} now.`,
  };
}
