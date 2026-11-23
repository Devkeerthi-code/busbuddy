# Testing

| Suite | Command | What it covers |
| --- | --- | --- |
| Logic | `npm test` | The shared tracking core and pure app logic: GPS filtering, projection, U-turns, arrivals, ETAs, history, delay, alerts, invite codes, travel order, answer states, labels, error messages |
| Database | `npm run test:db` | RLS isolation between colleges, roles, invite codes and rate limits, trip start/end rules, alert claiming exactly once, travel-order context |
| All checks | `npm run check` | Lint, type checks and logic tests (what CI runs) |

## Database tests

They connect with `DATABASE_URL` and run each test inside a transaction that is rolled back, so they never leave data behind. A helper switches role with `set local role authenticated` and sets `request.jwt.claims`, so policies are exercised exactly as the API would.

Some networks block Postgres ports (5432/6543). Then the database tests cannot connect; run them on another network.

## Regression tests

Bugs found in real runs get a test that fails on the old code first: ETAs ballooning while waiting at a stop, a trip started at a stop, stops behind the bus, the U-turn jump, and delay paired with the wrong stop.

## Manual checks

The README lists a phone checklist for the Android app (start, background, end, alerts).
