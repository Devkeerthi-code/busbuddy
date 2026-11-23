# Environment variables

`.env.example` lists every variable with where to find it. Where each one is read:

| Variable | Read by | Secret? |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | App (bundled), scripts, web build | No |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | App (bundled), scripts, web build | No; RLS protects the data |
| `SUPABASE_SECRET_KEY` | Seed, simulator reset, admin scripts | **Yes**: bypasses RLS. Never prefix with `EXPO_PUBLIC_` |
| `DATABASE_URL` | `db:migrate`, `db:seed`, `db:admins`, database tests | **Yes**: contains the database password |
| `ADMIN_EMAILS` | `db:admins` | No, but keep it private |
| `EAS_PROJECT_ID`, `EAS_OWNER` | `app.config.ts` for EAS builds | No |
| `ANDROID_PACKAGE` | `app.config.ts` | No |
| `GOOGLE_SERVICES_JSON` | EAS file variable for Firebase (push) | Keep private |
| `WEB_BASE_URL` | Web export for GitHub Pages (`/busbuddy`) | No |
| `INGEST_URL` | Simulator, to target a local Edge Function | No |

## Where they must be set

- **Local**: `.env` (gitignored).
- **EAS builds**: `eas env:create` for the two `EXPO_PUBLIC_` values and `GOOGLE_SERVICES_JSON`; cloud builds do not read `.env`.
- **GitHub Pages**: repository secrets `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- **Edge Function**: nothing to set; Supabase injects the URL and keys.

`EXPO_PUBLIC_` variables are compiled into the app, so anything with that prefix must be safe for anyone to read.
