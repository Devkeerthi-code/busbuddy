# `db-migrate.ts`

**File:** `scripts/db-migrate.ts`

`npm run db:migrate`

- Applies `supabase/migrations/*.sql` in order, once each, each in a transaction; records them in `private.schema_migrations`.

See also: [migrations.md](../migrations.md)
