# `route.ts`

**File:** `supabase/functions/_shared/core/route.ts`

Route shapes and positions along them.

- `buildRoute(points)`: cumulative distances; needs at least two points.
- `projectOnRoute(route, p, window)`: nearest point, optionally limited to a progress window.
- `pointAtDistance`, `sliceRoute`, `remainingDistance`, `stopDistances`.

See also: [route-projection.md](../route-projection.md)
