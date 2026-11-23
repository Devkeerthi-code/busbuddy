# Contributing

## Setup

1. Node 22 (`nvm use`), then `npm install`.
2. Copy `.env.example` to `.env` and fill it in (each variable is explained there).
3. `npm run db:migrate && npm run db:seed` against your own Supabase project.
4. `npm run web` for the web app, or a development build for Android (see the README).

## Before opening a pull request

- `npm run check` runs lint, type checks and the logic tests.
- `npm run test:db` runs the database and RLS tests (needs `DATABASE_URL`).
- Tracking logic lives in `supabase/functions/_shared/core` and is shared by the app, the Edge Function and the tests. Change it there, never copy it.
- Database changes go in a new file in `supabase/migrations`; never edit a migration that has been applied.

## Commit messages

Conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `style:`, `chore:`, `refactor:`.
