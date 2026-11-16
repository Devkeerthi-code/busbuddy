import { buildRoute, pointAtDistance, projectOnRoute, remainingDistance, sliceRoute, stopDistances } from '@core/route.ts';
import { haversineM } from '@core/geo.ts';
import { at } from './helpers';

// An L-shaped route: 1000 m east, then 1000 m north.
const lRoute = buildRoute([at(0, 0), at(1000, 0), at(1000, 1000)]);

describe('buildRoute', () => {
  it('measures cumulative length', () => {
    expect(lRoute.length).toBeCloseTo(2000, -1);
    expect(lRoute.cum[1]).toBeCloseTo(1000, -1);
  });

  it('rejects a route with fewer than two points', () => {
    expect(() => buildRoute([at(0, 0)])).toThrow();
  });
});

describe('projectOnRoute', () => {
  it('projects a point beside the first leg', () => {
    const p = projectOnRoute(lRoute, at(400, 30));
    expect(p.along).toBeCloseTo(400, -1);
    expect(p.offset).toBeCloseTo(30, 0);
    expect(p.segment).toBe(0);
  });

  it('projects onto the second leg after the corner', () => {
    const p = projectOnRoute(lRoute, at(1020, 600));
    expect(p.along).toBeCloseTo(1600, -1);
    expect(p.offset).toBeCloseTo(20, 0);
  });

  it('clamps points before the start and past the end', () => {
    expect(projectOnRoute(lRoute, at(-300, 0)).along).toBeCloseTo(0, 3);
    expect(projectOnRoute(lRoute, at(1000, 1400)).along).toBeCloseTo(lRoute.length, 3);
  });

  it('uses the window so an out-and-back road does not jump to the return leg', () => {
    // Out 1000 m east, then back west along the same road, 10 m to the north.
    const outAndBack = buildRoute([at(0, 0), at(1000, 0), at(1000, 10), at(0, 10)]);
    const nearStartOfReturn = at(300, 6);
    const unrestricted = projectOnRoute(outAndBack, nearStartOfReturn);
    expect(unrestricted.along).toBeGreaterThan(1000);

    const windowed = projectOnRoute(outAndBack, nearStartOfReturn, { minAlong: 200, maxAlong: 600 });
    expect(windowed.along).toBeCloseTo(300, -1);
  });
});

describe('distances along the route', () => {
  it('computes remaining distance and never goes negative', () => {
    expect(remainingDistance(400, 1600)).toBe(1200);
    expect(remainingDistance(1700, 1600)).toBe(0);
  });

  it('places stops in order along the shape', () => {
    const d = stopDistances(lRoute, [at(0, 0), at(990, 5), at(1000, 1000)]);
    expect(d[0]).toBeCloseTo(0, 3);
    expect(d[1]).toBeCloseTo(990, -1);
    expect(d[2]).toBeCloseTo(2000, -1);
  });

  it('finds the point at a distance, including around the corner', () => {
    expect(haversineM(pointAtDistance(lRoute, 1500), at(1000, 500))).toBeLessThan(1);
    expect(haversineM(pointAtDistance(lRoute, 99_999), at(1000, 1000))).toBeLessThan(1);
  });

  it('slices the driven part of the route', () => {
    const part = sliceRoute(lRoute, 500, 1500);
    expect(part).toHaveLength(3);
    expect(haversineM(part[1], at(1000, 0))).toBeLessThan(1);
  });
});
