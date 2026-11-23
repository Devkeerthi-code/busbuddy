# Morning and evening runs

A route is drawn once, from the first pickup to campus. Morning trips drive it forwards; evening trips drive the same road backwards.

Instead of storing two routes, the server works in **travel order**:

- `ingest_context()` returns stops sorted the way the bus reaches them and their distance measured from the end the bus starts at.
- The route shape is reversed for evening trips (`shapeInTravelOrder`).
- All tracking (projection, arrivals, ETAs) runs on these travel-order values, so the same code serves both directions.
- `record_position()` stores events by stop id, so history stays correct either way.

The app mirrors the same rules in `supabase/functions/_shared/core/direction.ts`, which is unit-tested.
