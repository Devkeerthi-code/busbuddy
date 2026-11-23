# end_trip

```sql
public.end_trip(p_trip uuid) returns void
```

**Who can call it:** The trip's driver or a transport admin of its college.

## What it does

- Completes an active trip with a reason, counts `trip_completed` and broadcasts on both the trip and college channels.

## Errors

| Code | When |
| --- | --- |
| `forbidden` | Neither the driver nor an admin |

**Used by:** Driver screen → Hold to end trip.
