# Route projection

A raw GPS point says nothing about how far along the route the bus is. `projectOnRoute()` finds the nearest point on the route line and returns:

- `along`: metres from the route start (the bus's **progress**),
- `offset`: metres between the fix and the road,
- `segment` and the snapped `point`.

## How

Each segment is projected in a local flat metre grid around its first point (`toLocalXY`), which is accurate to well under 1% at city scale and far cheaper than spherical maths. The closest segment wins.

## Progress never goes backwards

`processFix` keeps `max(previous progress, new along)`. A reversing bus is rare; a fix that lands 20 m behind is almost always noise.

## Off route

If `offset` is over 150 m the result is flagged `offRoute` (a diversion or a wrong route). Progress still uses the nearest point so ETAs degrade gracefully.
