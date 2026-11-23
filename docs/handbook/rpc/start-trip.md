# start_trip

```sql
public.start_trip(p_trip uuid) returns trips
```

**Who can call it:** The trip's assigned driver.

## What it does

- Moves a `scheduled` trip for today to `active` and resets its live fields and tracker state.
- Counts `trip_started` and broadcasts the new status on `trip:<id>`.
- A partial unique index allows only one active trip per driver.

## Errors

| Code | When |
| --- | --- |
| `cannot_start_trip` | Not the driver, not scheduled, or not today |

**Used by:** Driver screen → Start trip.
