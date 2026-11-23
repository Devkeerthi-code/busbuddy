# route_geometry

```sql
public.route_geometry(p_route uuid) returns jsonb
```

**Who can call it:** Members of the route's college; returns null for anyone else.

## What it does

- Returns `{ routeId, name, shape: [[lng, lat], ...], stops: [{ id, seq, name, along, lng, lat }] }` for drawing maps.

## Errors

None of its own; callers without access get no rows.

**Used by:** Rider map, admin live view, route editor.
