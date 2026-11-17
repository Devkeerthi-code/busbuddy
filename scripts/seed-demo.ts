/**
 * Creates (or recreates) the clearly labelled DEMO college: two routes with fictional stop
 * names on real roads, two buses, morning + evening trips every day, and demo accounts.
 * Passwords are random, printed once and written to .demo-accounts.local (git-ignored).
 */
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { connect } from './lib/db';
import { adminClient, upsertUser } from './lib/supabase-admin';

const DEMO_COLLEGE = 'DEMO · Northfield Institute (fictional)';
const ACCOUNTS_FILE = join(__dirname, '..', '.demo-accounts.local');

type DemoRoute = {
  name: string;
  busNumber: string;
  capacity: number;
  morningStart: string;
  eveningStart: string;
  stops: { name: string; lng: number; lat: number; minutesFromStart: number }[];
  shape: [number, number][];
};

const routes: DemoRoute[] = JSON.parse(readFileSync(join(__dirname, 'data', 'demo-routes.json'), 'utf8')).routes;

const password = () => `${randomBytes(9).toString('base64url')}-Bb7`;

const accounts = [
  { key: 'admin', email: 'demo.admin@example.com', name: 'Demo Transport Office', role: 'transport_admin' },
  { key: 'driverA', email: 'demo.driver.a@example.com', name: 'Demo Driver A', role: 'driver' },
  { key: 'driverB', email: 'demo.driver.b@example.com', name: 'Demo Driver B', role: 'driver' },
  { key: 'rider', email: 'demo.student@example.com', name: 'Demo Student', role: 'rider' },
] as const;

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

async function main() {
  const admin = adminClient();
  const ids: Record<string, string> = {};
  const lines: string[] = ['# DEMO accounts for BusBuddy. Local only, never commit.'];
  for (const a of accounts) {
    const pw = password();
    ids[a.key] = await upsertUser(admin, a.email, pw, a.name);
    lines.push(`${a.key}\t${a.email}\t${pw}`);
  }

  const db = await connect();
  try {
    await db.query('begin');
    await db.query('delete from public.colleges where is_demo and name = $1', [DEMO_COLLEGE]);
    await db.query('delete from public.memberships where user_id = any($1::uuid[])', [Object.values(ids)]);

    const { rows: [college] } = await db.query<{ id: string }>(
      `insert into public.colleges (name, campus_name, is_demo, created_by)
       values ($1, 'Northfield Campus', true, $2) returning id`, [DEMO_COLLEGE, ids.admin]);
    for (const a of accounts) {
      await db.query('insert into public.memberships (user_id, college_id, role, display_name) values ($1, $2, $3, $4)',
        [ids[a.key], college.id, a.role, a.name]);
    }
    const { rows: [codes] } = await db.query<{ rider: string; driver: string }>(
      `select private.new_invite_code($1, 'rider') as rider, private.new_invite_code($1, 'driver') as driver`, [college.id]);

    for (const [index, route] of routes.entries()) {
      const driverId = index === 0 ? ids.driverA : ids.driverB;
      const lineWkt = `LINESTRING(${route.shape.map(([lng, lat]) => `${lng} ${lat}`).join(',')})`;
      const { rows: [r] } = await db.query<{ id: string }>(
        `insert into public.routes (college_id, name, shape, shape_source)
         values ($1, $2, extensions.st_geogfromtext($3), 'survey') returning id`, [college.id, route.name, lineWkt]);

      const stopIds: string[] = [];
      for (const [seq, stop] of route.stops.entries()) {
        const { rows: [s] } = await db.query<{ id: string }>(
          `insert into public.route_stops (route_id, college_id, seq, name, location)
           values ($1, $2, $3, $4, extensions.st_setsrid(extensions.st_makepoint($5, $6), 4326)::extensions.geography)
           returning id`, [r.id, college.id, seq, stop.name, stop.lng, stop.lat]);
        stopIds.push(s.id);
      }
      await db.query('select private.refresh_route_geometry($1)', [r.id]);

      const { rows: [bus] } = await db.query<{ id: string }>(
        'insert into public.buses (college_id, number, capacity) values ($1, $2, $3) returning id',
        [college.id, route.busNumber, route.capacity]);

      const total = route.stops[route.stops.length - 1].minutesFromStart;
      for (const period of ['morning', 'evening'] as const) {
        const { rows: [tpl] } = await db.query<{ id: string }>(
          `insert into public.trip_templates (college_id, route_id, bus_id, driver_id, period, weekdays)
           values ($1, $2, $3, $4, $5, '{0,1,2,3,4,5,6}') returning id`, [college.id, r.id, bus.id, driverId, period]);
        for (const [seq, stop] of route.stops.entries()) {
          const minutes = period === 'morning' ? stop.minutesFromStart : total - stop.minutesFromStart;
          const start = period === 'morning' ? route.morningStart : route.eveningStart;
          await db.query('insert into public.template_stop_times (template_id, stop_id, scheduled_time) values ($1, $2, $3)',
            [tpl.id, stopIds[seq], addMinutes(start, minutes)]);
        }
      }
    }
    await db.query('commit');

    lines.push(`rider_invite_code\t${codes.rider}`, `driver_invite_code\t${codes.driver}`);
    writeFileSync(ACCOUNTS_FILE, `${lines.join('\n')}\n`, { mode: 0o600 });
    console.log(`Seeded "${DEMO_COLLEGE}" with ${routes.length} routes.`);
    console.log(`Rider invite code: ${codes.rider}   Driver invite code: ${codes.driver}`);
    console.log(`Demo logins written to .demo-accounts.local (git-ignored):`);
    for (const line of lines.slice(1, accounts.length + 1)) console.log(`  ${line.replace(/\t/g, '   ')}`);
  } catch (error) {
    await db.query('rollback');
    throw error;
  } finally {
    await db.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
