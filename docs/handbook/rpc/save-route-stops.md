# save_route_stops

```sql
public.save_route_stops(p_route uuid, p_stops jsonb) returns void
```

**Who can call it:** Transport admins of the route's college.

## What it does

- Takes the full ordered list (`[{ id?, name, lat, lng }]`, at most 60).
- Deletes stops no longer listed, updates kept ones, inserts new ones, renumbers `seq` from 0.
- Recomputes each stop's distance along the route.

## Errors

| Code | When |
| --- | --- |
| `forbidden` | Not an admin of this route's college |
| `bad_stops` | Not an array, or more than 60 stops |

**Used by:** Route editor → Save.
