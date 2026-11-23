# Scaling

Rough load for one college with 30 buses and 3,000 riders:

- **Uploads**: 30 buses × one request per 10 s = 3 requests/s at peak. Each is one Edge Function call and two RPCs.
- **Realtime**: 30 messages per 10 s on trip channels, each fanned out to that trip's riders.
- **Database writes**: one trip row update per upload, one breadcrumb per bus per 30 s, a few stop events.

That fits comfortably on Supabase's free tier.

## What breaks first

1. **Realtime message quota**: fan-out is messages × subscribers. Hundreds of colleges would need a paid plan or sending less often to idle viewers.
2. **Edge Function invocations**: about 1.2 million a month per 30 buses on a typical timetable. A paid plan, or longer batches, would be needed beyond a few colleges.
3. **ETA history queries** in `ingest_context` scan recent stop events per call; with many months of data this wants a materialised per-segment summary updated nightly.

## Not a concern yet

Breadcrumbs are purged after 7 days, so the largest table stays bounded (about 30 buses × 2 trips × 120 fixes per day).
