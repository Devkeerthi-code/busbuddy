# track_event

```sql
public.track_event(p_metric text) returns void
```

**Who can call it:** Any member.

## What it does

- Adds 1 to today's count for the caller's college. Only `rider_opened_live` and `rider_set_stop` are accepted.

## Errors

| Code | When |
| --- | --- |
| `unknown_metric` | Any other metric name |

**Used by:** Rider screens.
