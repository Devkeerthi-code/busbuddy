# `arrival.ts`

**File:** `supabase/functions/_shared/core/arrival.ts`

Stop arrival with hysteresis.

- `stepArrival(state, stops, distances, progress, t, opts)` returns the new state, events and whether the trip is complete.
- Defaults: enter 40 m for 2 fixes, exit 80 m, skip after 150 m.

See also: [stop-arrival.md](../stop-arrival.md)
