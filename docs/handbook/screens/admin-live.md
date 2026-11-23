# Fleet view

**File:** `src/app/admin/index.tsx` · **For:** Transport office

"Transport office · today": every active bus on one map with counts and today's trips.

## On the screen

- Counters: Buses live, Running late, Trips today, Alerts today.
- Map of all active buses, updated over one college channel.
- Today's trips with status and delay.

## States

- No trips planned today: points to Setup → Trips.
- Refresh failure: "Can't refresh the fleet" with Try again.
