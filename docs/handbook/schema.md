# Schema

Defined in `supabase/migrations/20261117000100_schema.sql`.

| Table | Holds |
| --- | --- |
| `colleges` | Name, campus, time zone, demo flag |
| `invite_codes` | One code per college and role |
| `memberships` | User → college with role and display name (one college per user) |
| `platform_admins` | Users who can see every college's counts |
| `routes` | Name and road shape (PostGIS `geography`) with its source (drawn or recorded) |
| `route_stops` | Ordered stops with location and distance along the route |
| `buses` | Bus number and seats |
| `trip_templates` | Timetable: route, bus, driver, period, weekdays, running flag |
| `template_stop_times` | Time at each stop for a template |
| `trips` | One run per day, with live fields (position, progress, ETAs, delay) and saved tracker state |
| `breadcrumbs` | Stored fixes, every 30 s, kept 7 days |
| `stop_events` | Arrive / depart / skip per stop per trip |
| `rider_prefs` | A rider's route, stop, period and alert setting |
| `push_tokens` | Expo push tokens per user and device |
| `notification_log` | Alerts sent, one per trip, user and kind |
| `usage_daily` | Daily counts per college and metric |
| `private.join_attempts` | Recent invite-code attempts per user, for rate limiting (not exposed to the API) |

## Isolation by design

Child tables carry `college_id` and use **composite foreign keys** (`(id, college_id)`), so a trip can never point at another college's route or bus even if a bug skipped a permission check.
