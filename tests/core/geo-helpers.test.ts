import { clamp, lerpLngLat, toLocalXY } from '@core/geo.ts';
import { at, ORIGIN } from './helpers';

describe('toLocalXY', () => {
  it('turns a nearby point into metres east and north of the origin', () => {
    const { x, y } = toLocalXY(ORIGIN, at(300, -400));
    expect(x).toBeCloseTo(300, 0);
    expect(y).toBeCloseTo(-400, 0);
  });
});

describe('lerpLngLat', () => {
  it('returns the ends at 0 and 1 and the midpoint at 0.5', () => {
    const a = { lng: 80, lat: 12 };
    const b = { lng: 81, lat: 14 };
    expect(lerpLngLat(a, b, 0)).toEqual(a);
    expect(lerpLngLat(a, b, 1)).toEqual(b);
    expect(lerpLngLat(a, b, 0.5)).toEqual({ lng: 80.5, lat: 13 });
  });
});

describe('clamp', () => {
  it('keeps values inside the range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});
