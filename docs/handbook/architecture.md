# Architecture

```mermaid
flowchart LR
  subgraph Driver["Driver phone (Android)"]
    T[Background location task] --> Q[(Fix queue)]
  end
  Q -- "batches of up to 50 fixes" --> F[Edge Function ingest-position]
  subgraph Supabase
    F --> C[shared tracking core]
    F --> DB[(Postgres + PostGIS)]
    DB --> RT[Realtime private channel per trip]
    CRON[pg_cron] --> DB
  end
  F -- "Expo push API" --> P[Riders' phones]
  RT --> R[Rider and admin screens]
  R -- "RLS-checked reads" --> DB
```

- **Clients**: one Expo Router codebase for Android and web.
- **Server logic**: Postgres functions for anything that must be atomic or permission-checked; one Edge Function for the hot path (positions).
- **Shared core**: the same TypeScript tracking code runs in the Edge Function (Deno), the app and Jest.
- **No custom server**: everything runs on Supabase's free tier.
