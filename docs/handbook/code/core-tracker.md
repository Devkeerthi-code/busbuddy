# `tracker.ts`

**File:** `supabase/functions/_shared/core/tracker.ts`

Runs one fix through the whole pipeline.

- `processFix(state, fix, ctx)`: filter → windowed projection → arrivals → speed → ETAs → delay → breadcrumb decision.
- Pure: the caller stores the returned state; a rejected fix returns the old state unchanged.

See also: [data-flow.md](../data-flow.md)
