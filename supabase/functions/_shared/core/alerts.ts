import type { StopEta } from './eta.ts';

export const ALERT_THRESHOLD_SECONDS = 5 * 60;

/** Stops whose ETA has crossed the "about 5 minutes away" line. */
export function stopsDueForAlert(etas: StopEta[], threshold = ALERT_THRESHOLD_SECONDS): number[] {
  return etas.filter((e) => e.seconds <= threshold).map((e) => e.seq);
}

export function alertMessage(busNumber: string, stopName: string, seconds: number): { title: string; body: string } {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return {
    title: `Bus ${busNumber} is about ${minutes} min away`,
    body: `Head to ${stopName} now.`,
  };
}
