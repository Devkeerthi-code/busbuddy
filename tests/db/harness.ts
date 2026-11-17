import { randomUUID } from 'node:crypto';
import type { Client } from 'pg';
import { connect } from '../../scripts/lib/db';

export type Db = {
  client: Client;
  /** run SQL as a signed-in user (RLS applies) */
  as: (userId: string) => Promise<void>;
  asAnon: () => Promise<void>;
  asService: () => Promise<void>;
  asOwner: () => Promise<void>;
  q: <T extends Record<string, unknown> = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]>;
  /** expect a statement to fail; returns the error message */
  fails: (sql: string, params?: unknown[]) => Promise<string>;
  createUser: (label: string) => Promise<string>;
};

/**
 * Every test runs inside one transaction that is rolled back, so the real
 * database is never changed. Savepoints let a test assert on an error and continue.
 */
export async function withDb(fn: (db: Db) => Promise<void>): Promise<void> {
  const client = await connect();
  await client.query('begin');
  const setClaims = async (role: string, sub: string | null) => {
    await client.query('reset role');
    const claims = JSON.stringify(sub ? { sub, role } : { role });
    await client.query("select set_config('request.jwt.claims', $1, true)", [claims]);
    if (role !== 'owner') await client.query(`set local role ${role}`);
  };

  const db: Db = {
    client,
    as: (userId) => setClaims('authenticated', userId),
    asAnon: () => setClaims('anon', null),
    asService: () => setClaims('service_role', null),
    asOwner: () => setClaims('owner', null),
    q: async (sql, params) => (await client.query(sql, params)).rows,
    fails: async (sql, params) => {
      await client.query('savepoint attempt');
      try {
        await client.query(sql, params);
      } catch (error) {
        await client.query('rollback to savepoint attempt');
        return error instanceof Error ? error.message : String(error);
      }
      await client.query('release savepoint attempt');
      throw new Error(`Expected statement to fail: ${sql}`);
    },
    createUser: async (label) => {
      const id = randomUUID();
      await client.query('reset role');
      await client.query(
        `insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
         values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, '', now(), now(), now())`,
        [id, `${label}-${id.slice(0, 8)}@test.invalid`],
      );
      return id;
    },
  };

  try {
    await fn(db);
  } finally {
    await client.query('rollback');
    await client.end();
  }
}

export type Fleet = {
  collegeId: string;
  adminId: string;
  driverId: string;
  riderId: string;
  routeId: string;
  tripId: string;
  riderCode: string;
  driverCode: string;
};

/** Builds a complete college (admin, driver, rider, route with 3 stops, bus, today's trip) through the real RPCs. */
export async function buildFleet(db: Db, label: string): Promise<Fleet> {
  const adminId = await db.createUser(`${label}-admin`);
  const driverId = await db.createUser(`${label}-driver`);
  const riderId = await db.createUser(`${label}-rider`);

  await db.as(adminId);
  const [{ id: collegeId }] = await db.q<{ id: string }>(
    'select public.create_college($1, $2, $3) as id', [`Test College ${label}`, 'Main Campus', 'Admin']);
  const codes = await db.q<{ code: string; role: string }>('select code, role from public.invite_codes');
  const riderCode = codes.find((c) => c.role === 'rider')!.code;
  const driverCode = codes.find((c) => c.role === 'driver')!.code;

  await db.as(driverId);
  await db.q('select * from public.join_college($1, $2)', [driverCode, 'Driver']);
  await db.as(riderId);
  await db.q('select * from public.join_college($1, $2)', [riderCode, 'Rider']);

  await db.as(adminId);
  const [{ id: routeId }] = await db.q<{ id: string }>(
    'insert into public.routes (college_id, name) values ($1, $2) returning id', [collegeId, 'Route A']);
  await db.q('select public.save_route_stops($1, $2)', [routeId, JSON.stringify([
    { name: 'Depot', lng: 80.2, lat: 12.9 },
    { name: 'Middle', lng: 80.21, lat: 12.9 },
    { name: 'Campus', lng: 80.22, lat: 12.9 },
  ])]);
  const [{ id: busId }] = await db.q<{ id: string }>(
    'insert into public.buses (college_id, number, capacity) values ($1, $2, 40) returning id', [collegeId, '12']);
  await db.q(
    `insert into public.trip_templates (college_id, route_id, bus_id, driver_id, period, weekdays)
     values ($1, $2, $3, $4, 'morning', '{0,1,2,3,4,5,6}')`, [collegeId, routeId, busId, driverId]);
  await db.q('select public.ensure_today_trips()');
  const [{ id: tripId }] = await db.q<{ id: string }>('select id from public.trips where route_id = $1', [routeId]);

  return { collegeId, adminId, driverId, riderId, routeId, tripId, riderCode, driverCode };
}

export const samplePosition = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    lng: 80.205, lat: 12.9, t: Date.now(), accuracy: 8, speed: 9, progress: 540,
    offRoute: false, delaySec: 60, doneSeq: 0, etas: [{ seq: 1, seconds: 120 }, { seq: 2, seconds: 260 }],
    events: [], breadcrumb: true, completed: false, tracker: {}, ...overrides,
  });
