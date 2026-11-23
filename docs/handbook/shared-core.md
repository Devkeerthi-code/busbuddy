# Shared tracking core

`supabase/functions/_shared/core/` holds the tracking logic as plain TypeScript with no runtime dependencies:

| File | Purpose |
| --- | --- |
| `geo.ts` | Distance, local projection, interpolation |
| `route.ts` | Route building, projection with a window, slicing |
| `jitter.ts` | Rejecting bad GPS fixes |
| `arrival.ts` | Stop arrival with hysteresis |
| `eta.ts` | Speed smoothing, ETAs, history blending, delay |
| `alerts.ts` | Which stops are due an alert and its wording |
| `invite.ts` | Invite code rules |
| `direction.ts` | Morning and evening travel order |
| `tracker.ts` | `processFix`, which combines all of the above |

It is imported three ways:

- **Deno** (Edge Function) with explicit `.ts` extensions.
- **The app** through the `@core/*` path alias (Metro).
- **Jest** through the same alias in `jest.config.js`.

One copy means the ETA a rider sees on the map preview and the ETA the server computes can never drift apart.
