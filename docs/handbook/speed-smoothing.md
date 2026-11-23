# Speed smoothing

ETAs need a speed that is steady but still reacts to traffic. BusBuddy keeps an exponentially weighted moving average:

```
speed = 0.3 × (progress gained / seconds) + 0.7 × previous speed
```

Details that matter:

- **Measured along the route**, not straight-line between fixes, so sideways GPS wobble never reads as movement.
- **Backwards progress counts as zero**, never negative.
- **Frozen near stops**: while any stop is within 80 m, speed is not updated. A bus slowing down, waiting and pulling out is dwell time, which the ETA already adds per stop. Counting those near-zero samples made ETAs balloon after every stop.
- **No time passed, no update**: duplicate timestamps keep the previous value.

The device-reported speed is not used: on many cheap phones it is missing or wildly wrong at low speeds.
