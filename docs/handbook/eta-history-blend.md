# Blending ETAs with history

Live speed knows about today's traffic but not about the signal or school zone ahead. History knows the road but not today. BusBuddy blends them per segment (stop to next stop).

`ingest_context()` returns, for each segment, the average travel seconds over recent completed trips and how many trips that is.

```
weight = min(0.7, trips / 10) × clamp((distance left − 500 m) / 2000 m, 0, 1)
eta    = weight × historical seconds × fraction of segment left + (1 − weight) × live seconds
```

- Fewer than 3 trips: weight 0, history ignored.
- Never more than 70% history.
- Within 500 m of the stop, live data wins completely; the bus is nearly there and its real speed is the best guide.

Tests: "blends towards history" and "weights history by both trip count and distance left".
