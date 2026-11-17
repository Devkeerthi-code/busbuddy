import { buildFleet, withDb } from './harness';

jest.setTimeout(60_000);

type Ctx = { stops: { name: string; seq: number; along: number }[]; shape: [number, number][] };

describe('ingest_context', () => {
  it('gives the tracker stops and shape in travel order for evening trips', () =>
    withDb(async (db) => {
      const a = await buildFleet(db, 'a');
      await db.as(a.adminId);
      await db.q("update public.trip_templates set period = 'evening' where route_id = $1", [a.routeId]);
      await db.asOwner();
      await db.q("update public.trips set period = 'evening' where id = $1", [a.tripId]);

      await db.as(a.driverId);
      await db.q('select public.start_trip($1)', [a.tripId]);
      const [{ ctx }] = await db.q<{ ctx: Ctx }>('select public.ingest_context($1) as ctx', [a.tripId]);

      expect(ctx.stops.map((s) => s.name)).toEqual(['Campus', 'Middle', 'Depot']);
      expect(ctx.stops.map((s) => s.seq)).toEqual([0, 1, 2]);
      expect(ctx.stops[0].along).toBeCloseTo(0, 0);
      expect(ctx.stops[2].along).toBeGreaterThan(2000);
      expect(ctx.shape[0][0]).toBeCloseTo(80.22, 5);
    }));

  it('measures stops along the shape when an admin saves them', () =>
    withDb(async (db) => {
      const a = await buildFleet(db, 'a');
      await db.as(a.adminId);
      const stops = await db.q<{ dist_along_m: number }>(
        'select dist_along_m from public.route_stops where route_id = $1 order by seq', [a.routeId]);
      expect(stops[0].dist_along_m).toBeCloseTo(0, 0);
      // 0.01 degrees of longitude at 12.9 N is about 1084 m.
      expect(stops[1].dist_along_m).toBeGreaterThan(1050);
      expect(stops[1].dist_along_m).toBeLessThan(1120);
    }));
});
