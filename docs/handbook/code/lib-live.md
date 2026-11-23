# `live.ts`

**File:** `src/lib/live.ts`

Live trip state from the database overlaid with realtime messages.

- `useLiveTrips(rows, refetch, topic, collegeId)` subscribes to private channels and refetches on a slow timer.
- Newest wins between a broadcast and a database read.

See also: [realtime.md](../realtime.md)
