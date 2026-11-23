# Where's my bus?

**File:** `src/app/rider/index.tsx` · **For:** Students and staff

The main screen: one large answer for the rider's stop, then every bus on that route today.

## On the screen

- First visit: pick Morning/Evening, route and "From · your stop", then Show my bus.
- The board: minutes to the stop, delay pill, "updated N s ago".
- "Buses on this route today" list, each with its own status.
- Alert at 5 minutes toggle; Change stop or route; Open map.

## States

- Before the trip starts: "Leaves at 07:05".
- At the stop, left the stop, completed and cancelled each have their own wording.
- No trips today, offline (with Try again) and stale data (dimmed) are all designed.
