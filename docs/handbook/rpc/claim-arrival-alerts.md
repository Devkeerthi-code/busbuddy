# claim_arrival_alerts

```sql
public.claim_arrival_alerts(p_trip uuid, p_stop_ids uuid[]) returns table (user_id uuid, token text, stop_id uuid, stop_name text, bus_number text)
```

**Who can call it:** `service_role` only (the Edge Function, with the secret key).

## What it does

- Finds riders with alerts on whose stop is in the list and who ride this route and period.
- Inserts into `notification_log` with `on conflict do nothing returning`, and returns only the rows it actually inserted, with each rider's push tokens.
- This makes "exactly once per trip" hold even when two uploads race.

## Errors

None of its own; callers without access get no rows.

**Used by:** `ingest-position` Edge Function, then the Expo push API.
