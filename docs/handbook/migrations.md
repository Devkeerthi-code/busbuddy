# Migrations

Plain SQL files in `supabase/migrations/`, applied in name order by `npm run db:migrate` (`scripts/db-migrate.ts`), which records each applied file so it runs once.

| File | What it does |
| --- | --- |
| `…0100_schema.sql` | Tables, enums, indexes, constraints |
| `…0200_rls.sql` | RLS helpers, policies, realtime policy |
| `…0300_functions.sql` | RPCs, triggers, invite code generation, usage counters |
| `…0400_jobs.sql` | pg_cron jobs: purges and closing stale trips |
| `…0500_join_rate_limit.sql` | A wrong invite code returns no row instead of raising, so the attempt that counts towards the rate limit is not rolled back |
| `…0600_claim_alerts_seq.sql` | Alert claiming returns the stop it was for |
| `…0700_trip_direction.sql` | Evening trips in travel order; events and alerts keyed by stop id |

## Rules

- Never edit a migration that has been applied anywhere; add a new file.
- Every migration must be safe to run on a database with data (no destructive drops without a backfill).
- Database tests (`npm run test:db`) run against the migrated schema inside rolled-back transactions.
