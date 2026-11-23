# ensure_today_trips

```sql
public.ensure_today_trips() returns void
```

**Who can call it:** Any member; a no-op for users without a college.

## What it does

- Works out today in the college's own time zone.
- Inserts one `scheduled` trip per running template whose weekdays include today.
- Idempotent: a unique key on (template, date) with `on conflict do nothing` means calling it on every app open is safe.

## Errors

None of its own; callers without access get no rows.

**Used by:** Rider, driver and admin screens before loading today's trips.
