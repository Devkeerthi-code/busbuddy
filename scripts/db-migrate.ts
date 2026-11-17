/** Applies supabase/migrations/*.sql in order, once each, each inside a transaction. */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { connect } from './lib/db';

const MIGRATIONS_DIR = join(__dirname, '..', 'supabase', 'migrations');

async function main() {
  const db = await connect();
  try {
    await db.query(`
      create schema if not exists private;
      create table if not exists private.schema_migrations (
        name text primary key,
        applied_at timestamptz not null default now()
      );`);
    const applied = new Set(
      (await db.query<{ name: string }>('select name from private.schema_migrations')).rows.map((r) => r.name),
    );
    const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();

    for (const file of files) {
      if (applied.has(file)) continue;
      process.stdout.write(`applying ${file} ... `);
      await db.query('begin');
      try {
        await db.query(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'));
        await db.query('insert into private.schema_migrations (name) values ($1)', [file]);
        await db.query('commit');
        console.log('ok');
      } catch (error) {
        await db.query('rollback');
        console.log('failed');
        throw error;
      }
    }
    console.log('Database is up to date.');
  } finally {
    await db.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
