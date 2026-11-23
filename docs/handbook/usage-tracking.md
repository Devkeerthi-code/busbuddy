# Usage counts

To be able to say "used by N people" honestly without tracking individuals, BusBuddy keeps **daily counts per college** in `usage_daily` (date, college, metric, count).

- Server-side events (`member_joined`, `trip_started`, `trip_completed`) are counted inside the functions that perform them with `private.bump()`.
- Two client events, `rider_opened_live` and `rider_set_stop`, go through `track_event(metric)`, which rejects any other name and always counts against the caller's own college.
- No user ids, device ids, IP addresses or locations are stored in these rows.

The transport office sees the last 30 days under **Setup → Usage · last 30 days (counts only)**; platform admins see totals per college on the Platform screen.
