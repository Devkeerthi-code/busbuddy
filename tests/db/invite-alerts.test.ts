import { buildFleet, samplePosition, withDb } from './harness';

jest.setTimeout(60_000);

describe('joining with an invite code', () => {
  it('joins with the role the code was made for, tolerating spaces and lowercase', () =>
    withDb(async (db) => {
      const a = await buildFleet(db, 'a');
      const newcomer = await db.createUser('new');
      await db.as(newcomer);
      const messy = ` ${a.driverCode.slice(0, 3).toLowerCase()}-${a.driverCode.slice(3)} `;
      const [joined] = await db.q<{ college_id: string; role: string }>('select * from public.join_college($1, $2)', [messy, 'Ravi']);
      expect(joined).toMatchObject({ college_id: a.collegeId, role: 'driver' });
    }));

  it('returns no college for an unknown code and creates no membership', () =>
    withDb(async (db) => {
      const user = await db.createUser('x');
      await db.as(user);
      expect(await db.q("select * from public.join_college('ZZZZZZ', 'X')")).toHaveLength(0);
      expect(await db.q('select 1 from public.memberships where user_id = $1', [user])).toHaveLength(0);
    }));

  it('is idempotent for the same college and refuses a second college', () =>
    withDb(async (db) => {
      const a = await buildFleet(db, 'a');
      const b = await buildFleet(db, 'b');
      await db.as(a.riderId);
      const [again] = await db.q<{ college_id: string }>('select * from public.join_college($1, $2)', [a.riderCode, 'Rider']);
      expect(again.college_id).toBe(a.collegeId);
      expect(await db.fails('select * from public.join_college($1, $2)', [b.riderCode, 'Rider'])).toMatch(/already_member/);
    }));

  it('rate-limits guessing after 10 attempts in 10 minutes', () =>
    withDb(async (db) => {
      const user = await db.createUser('guesser');
      await db.as(user);
      for (let i = 0; i < 10; i++) {
        expect(await db.q("select * from public.join_college('ZZZZZZ', 'X')")).toHaveLength(0);
      }
      expect(await db.fails("select * from public.join_college('ZZZZZZ', 'X')")).toMatch(/too_many_attempts/);
    }));

  it('rotating a code makes the old one stop working', () =>
    withDb(async (db) => {
      const a = await buildFleet(db, 'a');
      await db.as(a.adminId);
      const [{ code }] = await db.q<{ code: string }>("select public.rotate_invite_code('rider') as code");
      expect(code).not.toBe(a.riderCode);
      const user = await db.createUser('late');
      await db.as(user);
      expect(await db.q('select * from public.join_college($1, $2)', [a.riderCode, 'X'])).toHaveLength(0);
    }));
});

describe('arrival alert de-duplication', () => {
  it('claims an alert once per student per trip, however often it is asked', () =>
    withDb(async (db) => {
      const a = await buildFleet(db, 'a');
      await db.as(a.riderId);
      const [stop] = await db.q<{ id: string }>('select id from public.route_stops where route_id = $1 and seq = 1', [a.routeId]);
      await db.q(
        `insert into public.rider_prefs (user_id, college_id, route_id, stop_id, period) values ($1, $2, $3, $4, 'morning')`,
        [a.riderId, a.collegeId, a.routeId, stop.id]);
      await db.q("insert into public.push_tokens (token, user_id) values ('ExponentPushToken[test-device]', $1)", [a.riderId]);

      await db.as(a.driverId);
      await db.q('select public.start_trip($1)', [a.tripId]);
      await db.q('select public.record_position($1, $2)', [a.tripId, samplePosition()]);

      await db.asService();
      const first = await db.q<{ stop_name: string; bus_number: string }>(
        'select * from public.claim_arrival_alerts($1, $2)', [a.tripId, [stop.id]]);
      expect(first).toEqual([expect.objectContaining({ stop_name: 'Middle', bus_number: '12' })]);
      const second = await db.q('select * from public.claim_arrival_alerts($1, $2)', [a.tripId, [stop.id, stop.id]]);
      expect(second).toHaveLength(0);
    }));

  it('is not callable by students or drivers', () =>
    withDb(async (db) => {
      const a = await buildFleet(db, 'a');
      const [stop] = await db.q<{ id: string }>('select id from public.route_stops where route_id = $1 limit 1', [a.routeId]);
      await db.as(a.driverId);
      expect(await db.fails('select * from public.claim_arrival_alerts($1, $2)', [a.tripId, [stop.id]])).toMatch(/permission denied/);
    }));

  it('skips students who turned alerts off or wait at a stop not yet near', () =>
    withDb(async (db) => {
      const a = await buildFleet(db, 'a');
      await db.as(a.riderId);
      const stops = await db.q<{ id: string }>('select id from public.route_stops where route_id = $1 order by seq', [a.routeId]);
      const [near, far] = [stops[1], stops[2]];
      await db.q(
        `insert into public.rider_prefs (user_id, college_id, route_id, stop_id, period) values ($1, $2, $3, $4, 'morning')`,
        [a.riderId, a.collegeId, a.routeId, far.id]);
      await db.q("insert into public.push_tokens (token, user_id) values ('ExponentPushToken[t2]', $1)", [a.riderId]);
      await db.as(a.driverId);
      await db.q('select public.start_trip($1)', [a.tripId]);
      await db.asService();
      expect(await db.q('select * from public.claim_arrival_alerts($1, $2)', [a.tripId, [near.id]])).toHaveLength(0);
      await db.as(a.riderId);
      await db.q('update public.rider_prefs set stop_id = $1, alerts = false where user_id = $2', [near.id, a.riderId]);
      await db.asService();
      expect(await db.q('select * from public.claim_arrival_alerts($1, $2)', [a.tripId, [near.id]])).toHaveLength(0);
    }));
});
