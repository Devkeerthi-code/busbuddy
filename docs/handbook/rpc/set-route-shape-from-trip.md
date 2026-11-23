# set_route_shape_from_trip

```sql
public.set_route_shape_from_trip(p_trip uuid) returns void
```

**Who can call it:** Transport admins.

## What it does

- Builds a line from the trip's breadcrumbs, simplifies it and saves it as the route shape (`shape_source = trip`).
- Recomputes stop distances. Useful when the drawn route differs from the road the driver really takes.

## Errors

| Code | When |
| --- | --- |
| `forbidden` | Not an admin of the trip's college |
| `not_enough_path` | Fewer than 5 breadcrumbs |

**Used by:** Route editor → Follow the real road.
