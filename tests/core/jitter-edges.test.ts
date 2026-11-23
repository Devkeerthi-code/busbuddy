import { checkFix, JITTER_DEFAULTS, type Fix } from '@core/jitter.ts';
import { at } from './helpers';

const fix = (east: number, t: number, accuracy = 10): Fix => ({ ...at(east, 0), t, accuracy });

describe('checkFix edge cases', () => {
  it('accepts accuracy exactly at the limit and rejects just above it', () => {
    expect(checkFix(fix(0, 0, JITTER_DEFAULTS.maxAccuracyM), null)).toEqual({ ok: true });
    expect(checkFix(fix(0, 0, JITTER_DEFAULTS.maxAccuracyM + 1), null)).toEqual({ ok: false, reason: 'low_accuracy' });
  });

  it('treats a missing accuracy as low accuracy', () => {
    expect(checkFix(fix(0, 0, Number.NaN), null)).toEqual({ ok: false, reason: 'low_accuracy' });
  });

  it('rejects coordinates outside the globe', () => {
    expect(checkFix({ lng: 0, lat: 91, t: 0, accuracy: 5 }, null)).toEqual({ ok: false, reason: 'invalid' });
    expect(checkFix({ lng: 181, lat: 0, t: 0, accuracy: 5 }, null)).toEqual({ ok: false, reason: 'invalid' });
  });

  it('rejects a fix without a timestamp', () => {
    expect(checkFix(fix(0, Number.NaN), null)).toEqual({ ok: false, reason: 'invalid' });
  });

  it('lets callers loosen the accuracy limit', () => {
    expect(checkFix(fix(0, 0, 80), null, { maxAccuracyM: 100 })).toEqual({ ok: true });
  });

  it('accepts 30 m/s, just under the speed limit', () => {
    expect(checkFix(fix(150, 5000), fix(0, 0))).toEqual({ ok: true });
  });
});
