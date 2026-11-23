import { buildFleet, withDb } from './harness';

jest.setTimeout(60_000);

describe('leaving a college', () => {
  it('forgets the rider stop so no more alerts are sent', () =>
    withDb(async (db) => {
      const a = await buildFleet(db, 'a');
      const [stop] = await db.q<{ id: string }>('select id from public.route_stops where route_id = $1 order by seq limit 1', [a.routeId]);
      await db.as(a.riderId);
      await db.q(
        `insert into public.rider_prefs (user_id, college_id, route_id, stop_id, period, alerts)
         values ($1, $2, $3, $4, 'morning', true)
         on conflict (user_id) do update set alerts = true`,
        [a.riderId, a.collegeId, a.routeId, stop.id],
      );

      // What "Leave this college" does from the app.
      await db.q('delete from public.memberships where user_id = $1', [a.riderId]);

      await db.asOwner();
      expect(await db.q('select 1 from public.rider_prefs where user_id = $1', [a.riderId])).toHaveLength(0);
    }));
});
