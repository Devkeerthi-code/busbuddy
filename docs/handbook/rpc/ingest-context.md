# ingest_context

```sql
public.ingest_context(p_trip uuid) returns jsonb
```

**Who can call it:** The driver of the active trip (called by the Edge Function with the driver's token).

## What it does

- Returns everything `processFix` needs in one round trip: trip and bus, route shape and stops **in travel order** (reversed for evening runs), scheduled times as epoch ms, the saved tracker state and per-segment history.

## Errors

| Code | When |
| --- | --- |
| `not_your_active_trip` | Caller is not the driver, or the trip is not active |

**Used by:** `ingest-position` Edge Function.
