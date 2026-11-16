import { haversineM, type LngLat } from './geo.ts';

export type Fix = LngLat & {
  /** epoch milliseconds when the phone recorded the fix */
  t: number;
  /** horizontal accuracy radius in metres (68% confidence) */
  accuracy: number;
  /** device-reported speed in m/s, if any */
  speed?: number | null;
};

export const JITTER_DEFAULTS = {
  maxAccuracyM: 50,
  /** ~120 km/h; a college bus in city traffic never sustains this */
  maxSpeedMps: 33,
  /** a jump this small is plausible even over a tiny time gap (GPS wobble) */
  wobbleM: 25,
};

export type JitterVerdict =
  | { ok: true }
  | { ok: false; reason: 'low_accuracy' | 'stale' | 'impossible_jump' | 'invalid' };

export function checkFix(
  fix: Fix,
  previous: Fix | null,
  opts: Partial<typeof JITTER_DEFAULTS> = {},
): JitterVerdict {
  const o = { ...JITTER_DEFAULTS, ...opts };
  const valid =
    Number.isFinite(fix.lat) &&
    Number.isFinite(fix.lng) &&
    Math.abs(fix.lat) <= 90 &&
    Math.abs(fix.lng) <= 180 &&
    Number.isFinite(fix.t);
  if (!valid) return { ok: false, reason: 'invalid' };
  if (!Number.isFinite(fix.accuracy) || fix.accuracy > o.maxAccuracyM) {
    return { ok: false, reason: 'low_accuracy' };
  }
  if (!previous) return { ok: true };
  if (fix.t <= previous.t) return { ok: false, reason: 'stale' };

  const distance = haversineM(previous, fix);
  const seconds = (fix.t - previous.t) / 1000;
  if (distance > o.wobbleM && distance / seconds > o.maxSpeedMps) {
    return { ok: false, reason: 'impossible_jump' };
  }
  return { ok: true };
}
