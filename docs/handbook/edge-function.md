# Edge Function: ingest-position

`supabase/functions/ingest-position/index.ts` is the only server code outside Postgres.

## Request

`POST /functions/v1/ingest-position` with the driver's access token:

```json
{ "tripId": "uuid", "fixes": [{ "lat": 12.9, "lng": 80.2, "t": 1763890000000, "accuracy": 8, "speed": 9.1 }] }
```

## Responses

| Status | Meaning | What the phone does |
| --- | --- | --- |
| 200 | Fixes processed; returns trip status and next stop | Drops them from the queue; stops sharing if the trip completed |
| 400 | Body failed validation | Drops the batch (it can never succeed) |
| 401 | Missing or expired token | Keeps the batch; retries after the session refreshes |
| 403 | Not the driver of an active trip (ended by the office or the timeout) | Stops sharing and shows the trip as ended |
| 405 | Not a POST | — |
| 409 | The route has no shape yet | Stops sharing; the office must draw the route |

## Keys

The function calls Postgres as the driver (publishable key plus the driver's JWT), so RLS and the RPC checks still apply. Only alert claiming uses the secret key, which never leaves the server. It is deployed with `--no-verify-jwt` because it verifies the token itself through Supabase Auth.
