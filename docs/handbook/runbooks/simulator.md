# Run the bus simulator

**When:** Showing a live bus without driving.

1. `npm run simulate -- --route A --period morning`
2. It signs in as a DEMO driver, aligns today's demo timetable to now, starts the trip and drives the real route through the same Edge Function as a phone.
3. Options: `--speed 2` (twice as fast), `--from 3` (start at stop 3), `--no-drop` (skip the simulated signal drop; by default it also injects a GPS outlier, a stop dwell and a signal drop), `--keep-schedule` (keep the stored timetable).
4. Open the rider screen with the demo student, pick Route A, Morning, any stop.
5. If the network blocks database ports, the simulator still works: it talks to Supabase over HTTPS.
