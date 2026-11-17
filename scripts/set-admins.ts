/**
 * Grants platform-admin to the accounts listed in ADMIN_EMAILS (comma-separated).
 * Each person must have signed up in the app first; the grant is stored by user id,
 * so changing an email later can't silently make someone else an admin.
 */
import { connect } from './lib/db';
import { adminClient } from './lib/supabase-admin';

async function main() {
  const emails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (emails.length === 0) throw new Error('ADMIN_EMAILS is empty. Add your email to .env.');

  const admin = adminClient();
  const found = new Map<string, string>();
  for (let page = 1; page < 50 && found.size < emails.length; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    for (const u of data.users) if (u.email && emails.includes(u.email.toLowerCase())) found.set(u.email.toLowerCase(), u.id);
    if (data.users.length < 200) break;
  }

  const db = await connect();
  try {
    await db.query('begin');
    await db.query('delete from public.platform_admins');
    for (const id of found.values()) await db.query('insert into public.platform_admins (user_id) values ($1)', [id]);
    await db.query('commit');
  } finally {
    await db.end();
  }

  console.log(`Platform admins set: ${found.size} of ${emails.length}.`);
  const missing = emails.filter((e) => !found.has(e));
  if (missing.length) console.log(`Not signed up yet (sign up in the app, then run this again): ${missing.length} address(es).`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
