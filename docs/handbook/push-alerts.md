# Push alerts

A rider can turn on **Alert at 5 minutes**. They get exactly one notification per trip when their bus is about 5 minutes from their stop.

## Flow

1. The app registers an Expo push token (`push_tokens`) when the rider turns alerts on.
2. After each upload, the Edge Function finds stops whose ETA is now 5 minutes or less.
3. `claim_arrival_alerts(trip, stop ids)` inserts into `notification_log` with primary key `(trip, user, kind)` using `ON CONFLICT DO NOTHING ... RETURNING`. Only rows actually inserted are returned, so concurrent uploads can never send twice.
4. The function sends those through the Expo push API, which delivers via Firebase Cloud Messaging on Android.

## Wording

"Bus 12 is about 5 min away" / "Head to Old Toll Gate now." Minutes are rounded and never shown as 0.

## Not on web

Browsers are not supported for push; on the web the toggle explains that alerts need the Android app.
