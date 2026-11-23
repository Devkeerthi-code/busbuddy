# Security

BusBuddy handles live locations of buses and the accounts of students and drivers, so security reports are welcome.

## Reporting

Open a [private security advisory](https://github.com/Devkeerthi-code/busbuddy/security/advisories/new) instead of a public issue. Include the steps to reproduce and what an attacker could read or change.

## What is in scope

- Reading or changing another college's data (routes, trips, members, invite codes).
- A student seeing a driver's position outside an active trip.
- Uploading positions for a trip that is not your own.
- Leaking the Supabase secret key or push tokens.

## How data is protected

- Every table has row-level security; a user only sees rows of the one college they belong to.
- Realtime channels are private and authorised per trip.
- Positions are accepted only from the assigned driver of an active trip, validated on the server.
- Breadcrumbs are deleted after 7 days.

See [docs/handbook/security-model.md](docs/handbook/security-model.md) for details.
