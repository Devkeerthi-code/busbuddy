# ETA

`estimateStopEtas()` in `core/eta.ts` returns seconds until the bus reaches each upcoming stop.

For each stop, in travel order:

1. **Distance**: route distance from the bus (or from the previous stop) to this stop.
2. **Live time**: distance ÷ smoothed speed, with the speed clamped to 2–20 m/s. Before any movement is seen, 7 m/s (~25 km/h) is used.
3. **History**: blended in when enough past trips exist ([details](eta-history-blend.md)).
4. **Dwell**: 30 s is added after each intermediate stop.

Stops already behind the bus (a trip picked up mid-route before they are marked passed) get no ETA, add no distance and can never trigger an alert.

## Why not a routing API

A routing API would need a paid key, network calls per fix and would not know where college buses stop. Route distance plus smoothed speed plus history is free, runs inside the function and is easy to test.
