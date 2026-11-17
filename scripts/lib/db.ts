import { Client } from 'pg';

/** Session-safe connection string: Prisma-style "?pgbouncer=true" is not a libpq option. */
export function databaseUrl(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
  const url = new URL(raw);
  url.searchParams.delete('pgbouncer');
  url.searchParams.delete('connection_limit');
  return url.toString();
}

export async function connect(): Promise<Client> {
  const client = new Client({ connectionString: databaseUrl(), ssl: { rejectUnauthorized: false } });
  await client.connect();
  return client;
}
