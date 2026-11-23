# Security model

## Keys

- The app ships only the **publishable** key. It identifies the project and is safe to bundle; every request is still checked by row-level security as the signed-in user.
- The **secret** key bypasses RLS. It lives only in `.env` for scripts and in the Edge Function's environment. It is never bundled, logged or committed.

## Row-level security

Every public table has RLS enabled. Policies call helpers in the `private` schema ([RLS helpers](rls-helpers.md)):

- Members read their own college's routes, stops, buses, timetables and trips.
- Riders write only their own preferences and push tokens.
- Transport admins write their college's setup tables and members.
- Live positions are written only through `record_position()`, which checks the caller is the driver of that active trip.

## Functions

Writes with rules (joining, starting trips, saving stops) go through `security definer` functions that check permissions first, run in one transaction and set `search_path` to empty so they cannot be hijacked by a user-created object.

## Realtime

Channels are private; a policy on `realtime.messages` lets only members of the trip's college join `trip:<id>`.

## Defence in depth

Composite foreign keys make cross-college references impossible at the schema level, so a missed check in one function still cannot link two colleges' data.
