# Data flow of one GPS fix

1. **Phone**: the location task receives a fix (every ~5 s, high accuracy) and appends it to a queue in AsyncStorage (max 300).
2. **Upload**: every 10 s while moving more than 15 m, or every 20 s as a heartbeat, the phone posts up to 50 queued fixes to `ingest-position` with the driver's JWT.
3. **Validate**: the function checks the body with zod (coordinates in range, 1–50 fixes, a trip id).
4. **Context**: `ingest_context(trip)` returns the route shape, stops in travel order, history and the saved tracker state. It fails unless the caller is the trip's driver and the trip is active.
5. **Track**: each fix runs through `processFix`: filter, project, detect stops, update speed and ETAs.
6. **Store**: `record_position()` saves the live fields and tracker state, inserts stop events (de-duplicated) and a breadcrumb every 30 s, then broadcasts on `trip:<id>`.
7. **Alert**: stops now within 5 minutes are claimed with `claim_arrival_alerts()` and sent through the Expo push API.
8. **Riders**: the realtime message updates the answer card and map; the marker glides to the new position.
