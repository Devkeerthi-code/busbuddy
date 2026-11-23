import { haversineM } from '@core/geo.ts';
import { at } from './helpers';

describe('haversineM', () => {
  it('measures one degree of latitude as about 111.2 km', () => {
    expect(haversineM({ lng: 80, lat: 12 }, { lng: 80, lat: 13 })).toBeCloseTo(111_195, -1);
  });

  it('is zero for the same point and symmetric', () => {
    const a = at(0, 0);
    const b = at(300, 400);
    expect(haversineM(a, a)).toBe(0);
    expect(haversineM(a, b)).toBeCloseTo(haversineM(b, a), 6);
  });

  it('matches a 3-4-5 triangle at city scale', () => {
    expect(haversineM(at(0, 0), at(300, 400))).toBeCloseTo(500, 0);
  });
});
