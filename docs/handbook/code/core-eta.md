# `eta.ts`

**File:** `supabase/functions/_shared/core/eta.ts`

Speed smoothing, ETAs, history blending and delay.

- `updateSpeed`, `estimateStopEtas`, `historyWeight`, `delaySeconds`.
- Defaults in `ETA_DEFAULTS`: alpha 0.3, speeds 2–20 m/s, fallback 7 m/s, dwell 30 s.

See also: [eta.md](../eta.md)
