# Database functions (RPCs)

All are `security definer` with an empty `search_path` and check permissions themselves. Errors are raised as short codes, which the app turns into sentences in `src/lib/errors.ts`.

- [create_college](create-college.md)
- [join_college](join-college.md)
- [rotate_invite_code](rotate-invite-code.md)
- [ensure_today_trips](ensure-today-trips.md)
- [start_trip](start-trip.md)
- [end_trip](end-trip.md)
- [ingest_context](ingest-context.md)
- [record_position](record-position.md)
- [claim_arrival_alerts](claim-arrival-alerts.md)
- [save_route_stops](save-route-stops.md)
- [set_route_shape_from_trip](set-route-shape-from-trip.md)
- [route_geometry](route-geometry.md)
- [track_event](track-event.md)
