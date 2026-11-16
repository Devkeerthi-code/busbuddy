import { checkFix, type Fix } from '@core/jitter.ts';
import { at } from './helpers';

const fix = (east: number, t: number, accuracy = 8): Fix => ({ ...at(east, 0), t, accuracy });

describe('checkFix', () => {
  it('accepts the first good fix', () => {
    expect(checkFix(fix(0, 1000), null)).toEqual({ ok: true });
  });

  it('drops low-accuracy fixes', () => {
    expect(checkFix(fix(0, 1000, 120), null)).toEqual({ ok: false, reason: 'low_accuracy' });
  });

  it('drops out-of-order and duplicate timestamps', () => {
    expect(checkFix(fix(10, 1000), fix(0, 2000))).toEqual({ ok: false, reason: 'stale' });
    expect(checkFix(fix(10, 2000), fix(0, 2000))).toEqual({ ok: false, reason: 'stale' });
  });

  it('drops a teleport (2 km in 5 s)', () => {
    expect(checkFix(fix(2000, 6000), fix(0, 1000))).toEqual({ ok: false, reason: 'impossible_jump' });
  });

  it('keeps normal city driving (60 m in 5 s = 43 km/h)', () => {
    expect(checkFix(fix(60, 6000), fix(0, 1000))).toEqual({ ok: true });
  });

  it('keeps small wobble even over a very short gap', () => {
    expect(checkFix(fix(15, 1200), fix(0, 1000))).toEqual({ ok: true });
  });

  it('keeps a slow-moving bus in traffic', () => {
    expect(checkFix(fix(3, 6000), fix(0, 1000))).toEqual({ ok: true });
  });

  it('rejects NaN coordinates', () => {
    expect(checkFix({ lat: NaN, lng: 80, t: 1, accuracy: 5 }, null)).toEqual({ ok: false, reason: 'invalid' });
  });
});
