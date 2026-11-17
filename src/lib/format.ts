/** Short, glanceable strings for the board and cards. */

export function minutesFromSeconds(seconds: number): number {
  return Math.max(0, Math.round(seconds / 60));
}

export function agoLabel(fromMs: number | null, nowMs: number): string {
  if (fromMs === null) return 'no signal yet';
  const s = Math.max(0, Math.round((nowMs - fromMs) / 1000));
  if (s < 10) return 'updated just now';
  if (s < 90) return `updated ${s} s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `updated ${m} min ago`;
  return 'updated over an hour ago';
}

export type DelayTone = 'ontime' | 'late' | 'neutral';

export function delayLabel(delaySec: number | null): { text: string; tone: DelayTone } {
  if (delaySec === null) return { text: 'No schedule', tone: 'neutral' };
  const minutes = Math.round(delaySec / 60);
  if (minutes >= 2) return { text: `${minutes} min late`, tone: 'late' };
  if (minutes <= -3) return { text: `${-minutes} min early`, tone: 'ontime' };
  return { text: 'On time', tone: 'ontime' };
}

export function clockTime(date: Date, timeZone?: string): string {
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone });
}

/** "07:05:00" (Postgres time) -> "07:05" */
export function shortTime(pgTime: string | null | undefined): string {
  return pgTime ? pgTime.slice(0, 5) : '–';
}

export function distanceLabel(metres: number): string {
  return metres < 1000 ? `${Math.round(metres / 10) * 10} m` : `${(metres / 1000).toFixed(1)} km`;
}
