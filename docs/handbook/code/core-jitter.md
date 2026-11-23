# `jitter.ts`

**File:** `supabase/functions/_shared/core/jitter.ts`

Rejects GPS fixes that cannot be right.

- `checkFix(fix, previous, opts)` returns `{ ok: true }` or a reason: `invalid`, `low_accuracy`, `stale`, `impossible_jump`.
- Defaults: 50 m accuracy, 33 m/s, 25 m wobble.

See also: [gps-filtering.md](../gps-filtering.md)
