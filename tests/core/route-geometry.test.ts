import { haversineM } from '@core/geo.ts';
import { buildRoute, pointAtDistance, projectOnRoute, sliceRoute } from '@core/route.ts';
import { at } from './helpers';

const lShape = buildRoute([at(0, 0), at(1000, 0), at(1000, 1000)]);

describe('route geometry', () => {
  it('stores a cumulative distance for every point', () => {
    expect(lShape.cum).toHaveLength(3);
    expect(lShape.cum[0]).toBe(0);
    expect(lShape.cum[1]).toBeLessThan(lShape.cum[2]);
  });

  it('clamps pointAtDistance to the ends of the route', () => {
    expect(haversineM(pointAtDistance(lShape, -50), at(0, 0))).toBeLessThan(0.01);
    expect(haversineM(pointAtDistance(lShape, 99_999), at(1000, 1000))).toBeLessThan(0.01);
  });

  it('reports how far a point is from the road', () => {
    const p = projectOnRoute(lShape, at(500, 30));
    expect(p.along).toBeCloseTo(500, 0);
    expect(p.offset).toBeCloseTo(30, 0);
    expect(p.segment).toBe(0);
  });

  it('keeps a projection inside the requested window', () => {
    const p = projectOnRoute(lShape, at(900, 0), { maxAlong: 400 });
    expect(p.along).toBeCloseTo(400, 0);
  });

  it('slices across a corner and keeps the corner point', () => {
    const part = sliceRoute(lShape, 500, 1500);
    expect(part).toHaveLength(3);
    expect(haversineM(part[1], at(1000, 0))).toBeLessThan(0.01);
  });

  it('collapses a reversed slice to a single position', () => {
    const part = sliceRoute(lShape, 800, 200);
    expect(part).toHaveLength(2);
    expect(haversineM(part[0], part[1])).toBeLessThan(0.01);
  });
});
