# Data retention

BusBuddy keeps location data only as long as it is useful.

| Data | Kept | Why |
| --- | --- | --- |
| Breadcrumbs (stored fixes) | 7 days | History screen and recording a route shape from a real trip |
| Live position on a trip | Until the trip ends | Riders need it only while the bus runs |
| Stop events | Kept | Small; they power ETA history and punctuality |
| Invite-code attempts | 1 day | Only needed for the 10-minute rate limit |
| Usage counts | Kept | Daily totals per college, no personal data |

A driver's location is recorded **only during an active trip they started**. There is no tracking outside trips.

Purges run nightly through pg_cron; see [Scheduled jobs](cron-jobs.md).
