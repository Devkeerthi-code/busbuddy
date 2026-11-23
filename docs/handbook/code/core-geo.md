# `geo.ts`

**File:** `supabase/functions/_shared/core/geo.ts`

Distance and coordinate helpers.

- `haversineM(a, b)`: great-circle distance in metres.
- `toLocalXY(origin, p)`: metres east/north of an origin; accurate to well under 1% at city scale.
- `lerpLngLat`, `clamp`.

See also: [route-projection.md](../route-projection.md)
