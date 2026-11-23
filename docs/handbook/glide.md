# Gliding marker

Positions arrive every ~10 seconds. Jumping the marker each time looks broken; animating latitude and longitude in a straight line cuts corners through buildings.

`useGlide()` in `src/lib/glide.ts` animates **progress along the route** instead, and the map places the marker at `pointAtDistance(route, progress)`. The bus therefore follows the road, including around corners.

- About 4 seconds per update, at ~20 frames per second, which is cheap on low-end phones.
- Jumps instantly when the system "reduce motion" setting is on.
- Jumps instantly for gaps over 3 km (first load, or a trip resuming after a long outage).
