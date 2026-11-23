# record_position

```sql
public.record_position(p_trip uuid, p jsonb) returns void
```

**Who can call it:** The driver of the active trip (through the Edge Function).

## What it does

- Saves the live fields (position, progress, ETAs, delay, last stop) and the tracker state.
- Inserts stop events keyed by stop id with `on conflict` so retries never duplicate them.
- Inserts a breadcrumb when asked; finishes the trip when the last stop is reached.
- Broadcasts the position on `trip:<id>` and `college:<id>` in the same transaction.

## Errors

| Code | When |
| --- | --- |
| `not_your_active_trip` | Caller is not the driver, or the trip is not active |

**Used by:** `ingest-position` Edge Function.
