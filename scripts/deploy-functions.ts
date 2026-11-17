/**
 * Deploys the ingest-position Edge Function to the project in EXPO_PUBLIC_SUPABASE_URL.
 * Needs a one-time `npx supabase login`. JWT checking happens inside the function (every
 * database call runs as the signed-in driver), so the gateway check is turned off: it only
 * understands legacy JWT secrets, not the project's new signing keys.
 */
import { spawnSync } from 'node:child_process';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const ref = /^https:\/\/([a-z0-9]+)\.supabase\.co/.exec(url)?.[1];
if (!ref) {
  console.error('EXPO_PUBLIC_SUPABASE_URL must look like https://<project-ref>.supabase.co');
  process.exit(1);
}

const result = spawnSync(
  'npx',
  ['--yes', 'supabase@latest', 'functions', 'deploy', 'ingest-position', `--remote=${ref}`, '--no-verify-jwt', '--use-api'],
  { stdio: 'inherit', shell: process.platform === 'win32' },
);
process.exit(result.status ?? 1);
