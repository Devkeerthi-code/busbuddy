import { buildFleet, samplePosition, withDb } from './harness';

jest.setTimeout(60_000);

describe('driver publishing', () => {
  it('lets the assigned driver publish for their active trip', () =>
    withDb(async (db) => {
      const a = await buildFleet(db, 'a');
      await db.as(a.driverId);
      await db.q('select public.start_trip($1)', [a.tripId]);
      await db.q('select public.record_position($1, $2)', [a.tripId, samplePosition()]);

      await db.as(a.adminId);
      const [trip] = await db.q<{ progress_m: number }>('select progress_m from public.trips where id = $1', [a.tripId]);
      expect(trip.progress_m).toBe(540);
      const crumbs = await db.q('select 1 from public.breadcrumbs where trip_id = $1', [a.tripId]);
      expect(crumbs).toHaveLength(1);
    }));

  it("blocks a driver from posting for another driver's trip", () =>
    withDb(async (db) => {
      const a = await buildFleet(db, 'a');
      const b = await buildFleet(db, 'b');
      await db.as(a.driverId);
      await db.q('select public.start_trip($1)', [a.tripId]);

      await db.as(b.driverId);
      expect(await db.fails('select public.record_position($1, $2)', [a.tripId, samplePosition()]))
        .toMatch(/not_your_active_trip/);
      expect(await db.fails('select public.start_trip($1)', [a.tripId])).toMatch(/cannot_start_trip|permission/);
      expect(await db.fails('select public.ingest_context($1)', [a.tripId])).toMatch(/not_your_active_trip/);
    }));

  it('blocks a rider from posting, even for their own college', () =>
    withDb(async (db) => {
      const a = await buildFleet(db, 'a');
      await db.as(a.driverId);
      await db.q('select public.start_trip($1)', [a.tripId]);
      await db.as(a.riderId);
      expect(await db.fails('select public.record_position($1, $2)', [a.tripId, samplePosition()]))
        .toMatch(/not_your_active_trip/);
    }));

  it('rejects direct writes to positions and trips', () =>
    withDb(async (db) => {
      const a = await buildFleet(db, 'a');
      await db.as(a.driverId);
      expect(await db.fails(
        `insert into public.breadcrumbs (trip_id, college_id, recorded_at, location)
         values ($1, $2, now(), 'SRID=4326;POINT(80.2 12.9)')`, [a.tripId, a.collegeId])).toMatch(/permission denied/);
      expect(await db.fails('update public.trips set progress_m = 1 where id = $1', [a.tripId]))
        .toMatch(/permission denied/);
    }));

  it('refuses positions once the trip has ended', () =>
    withDb(async (db) => {
      const a = await buildFleet(db, 'a');
      await db.as(a.driverId);
      await db.q('select public.start_trip($1)', [a.tripId]);
      await db.q('select public.end_trip($1)', [a.tripId]);
      expect(await db.fails('select public.record_position($1, $2)', [a.tripId, samplePosition()]))
        .toMatch(/not_your_active_trip/);
    }));
});

describe('college isolation', () => {
  it("hides one college's trips, routes and positions from another college", () =>
    withDb(async (db) => {
      const a = await buildFleet(db, 'a');
      const b = await buildFleet(db, 'b');
      await db.as(a.driverId);
      await db.q('select public.start_trip($1)', [a.tripId]);
      await db.q('select public.record_position($1, $2)', [a.tripId, samplePosition()]);

      for (const outsider of [b.riderId, b.driverId, b.adminId]) {
        await db.as(outsider);
        expect(await db.q('select 1 from public.trips where id = $1', [a.tripId])).toHaveLength(0);
        expect(await db.q('select 1 from public.routes where id = $1', [a.routeId])).toHaveLength(0);
        expect(await db.q('select 1 from public.breadcrumbs where trip_id = $1', [a.tripId])).toHaveLength(0);
        expect(await db.q('select 1 from public.colleges where id = $1', [a.collegeId])).toHaveLength(0);
        const [geo] = await db.q<{ g: unknown }>('select public.route_geometry($1) as g', [a.routeId]);
        expect(geo.g).toBeNull();
      }
    }));

  it('lets only members receive the trip realtime channel', () =>
    withDb(async (db) => {
      const a = await buildFleet(db, 'a');
      const b = await buildFleet(db, 'b');
      await db.as(a.driverId);
      await db.q('select public.start_trip($1)', [a.tripId]);
      await db.q('select public.record_position($1, $2)', [a.tripId, samplePosition()]);

      const visible = async (userId: string, topic: string) => {
        await db.as(userId);
        await db.q("select set_config('realtime.topic', $1, true)", [topic]);
        const rows = await db.q("select 1 from realtime.messages where topic = $1 and extension = 'broadcast'", [topic]);
        return rows.length;
      };
      expect(await visible(a.riderId, `trip:${a.tripId}`)).toBeGreaterThan(0);
      expect(await visible(b.riderId, `trip:${a.tripId}`)).toBe(0);
      expect(await visible(a.riderId, `college:${a.collegeId}`)).toBeGreaterThan(0);
      expect(await visible(b.adminId, `college:${a.collegeId}`)).toBe(0);
    }));

  it('gives anonymous visitors nothing', () =>
    withDb(async (db) => {
      await buildFleet(db, 'a');
      await db.asAnon();
      expect(await db.fails('select 1 from public.trips')).toMatch(/permission denied/);
      expect(await db.fails("select public.join_college('ABCDEF', 'x')")).toMatch(/permission denied/);
    }));

  it('limits rider location history to the transport office', () =>
    withDb(async (db) => {
      const a = await buildFleet(db, 'a');
      await db.as(a.driverId);
      await db.q('select public.start_trip($1)', [a.tripId]);
      await db.q('select public.record_position($1, $2)', [a.tripId, samplePosition()]);
      await db.as(a.riderId);
      expect(await db.q('select 1 from public.breadcrumbs')).toHaveLength(0);
      await db.as(a.adminId);
      expect(await db.q('select 1 from public.breadcrumbs')).toHaveLength(1);
    }));
});

describe('transport admin scope', () => {
  it('manages only their own college', () =>
    withDb(async (db) => {
      const a = await buildFleet(db, 'a');
      const b = await buildFleet(db, 'b');
      await db.as(b.adminId);
      const updated = await db.q('update public.buses set capacity = 10 where college_id = $1 returning id', [a.collegeId]);
      expect(updated).toHaveLength(0);
      expect(await db.fails(
        "insert into public.routes (college_id, name) values ($1, 'Hijack')", [a.collegeId])).toMatch(/row-level security/);
      expect(await db.fails('select public.save_route_stops($1, $2)', [a.routeId, '[]'])).toMatch(/forbidden/);
    }));

  it("cannot assign another college's driver to a trip", () =>
    withDb(async (db) => {
      const a = await buildFleet(db, 'a');
      const b = await buildFleet(db, 'b');
      await db.as(a.adminId);
      expect(await db.fails('update public.trips set driver_id = $1 where id = $2', [b.driverId, a.tripId]))
        .toMatch(/driver_not_in_college/);
    }));

  it('a rider cannot make themselves an admin', () =>
    withDb(async (db) => {
      const a = await buildFleet(db, 'a');
      await db.as(a.riderId);
      const rows = await db.q("update public.memberships set role = 'transport_admin' where user_id = $1 returning 1", [a.riderId]);
      expect(rows).toHaveLength(0);
    }));
});
