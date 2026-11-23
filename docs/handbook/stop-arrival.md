# Stop arrival

`stepArrival()` in `core/arrival.ts` turns fixes into **arrive**, **depart** and **skip** events.

| Rule | Value |
| --- | --- |
| Enter a stop | 2 consecutive fixes within 40 m |
| Leave a stop | first fix beyond 80 m |
| Mark an unvisited stop as passed | progress more than 150 m beyond it |

## Why hysteresis

A bus idling 45 m from a stop, with GPS wobbling ±10 m, would arrive and depart every few seconds if one radius were used for both. Entering at 40 m and leaving at 80 m makes the state stable.

## Why two fixes

One fix inside 40 m can be a GPS blip while the bus drives past on a parallel road. Two in a row is cheap to wait for (5–10 s) and removes most false arrivals.

## Skips

Buses often drive past a stop when nobody is waiting. Those stops are marked `skip`, and arriving at a later stop also skips any earlier ones still open. A trip completes when the last stop is arrived at or passed.
