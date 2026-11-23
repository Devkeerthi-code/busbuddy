# Roads that double back

Indian city routes often go out on one side of a divided road, U-turn at a median gap and come back on the other side, 15 m away. A plain nearest-point search would snap the bus to the return leg as soon as GPS drifts sideways, jumping progress by kilometres and making ETAs useless.

## The search window

`processFix` only searches the part of the route the bus could physically have reached:

- **from** `progress − 50 m` (small backtrack tolerance),
- **to** `progress + max(200 m, 33 m/s × seconds since last fix × 1.2)`.

After a long gap (tunnel, phone asleep) the window grows with time, so the bus can still catch up. Points outside the window are clamped to its edge rather than ignored.

Tests: "processFix on a road that doubles back" in `tests/core/eta.test.ts` covers both staying on the outbound leg and following the return leg once the bus has really turned.
