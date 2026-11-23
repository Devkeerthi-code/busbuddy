# Deploy the Edge Function

**When:** After changing tracking code in `supabase/functions`.

1. `npx supabase login` once.
2. `npm run functions:deploy` (uses `--remote` with your project ref). To test locally first, `npm run functions:serve` and run the simulator with `INGEST_URL=http://127.0.0.1:8000`.
3. Run the simulator for a minute and check ETAs look sane.
4. The shared core is bundled into the function at deploy time, so app and server stay in step only after a deploy.
