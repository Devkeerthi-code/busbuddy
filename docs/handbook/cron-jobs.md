# Scheduled jobs

Defined in `supabase/migrations/20261117000400_jobs.sql` with `pg_cron` (times are UTC).

| Job | Schedule | Does |
| --- | --- | --- |
| `busbuddy-close-stale-trips` | every 10 minutes | Completes active trips with no fix for 30 minutes |
| `busbuddy-purge-breadcrumbs` | 03:15 daily | Deletes breadcrumbs older than 7 days |
| `busbuddy-purge-join-attempts` | 03:30 daily | Deletes invite-code attempts older than 1 day |

## Checking them

```sql
select jobname, schedule, active from cron.job;
select jobid, status, start_time, return_message from cron.job_run_details order by start_time desc limit 20;
```

Today's trips are not created by cron: `ensure_today_trips()` runs on demand when someone opens the app, in the college's own time zone, so a college in another time zone gets its trips at its own midnight.
