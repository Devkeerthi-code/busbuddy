# Roles

A user belongs to at most one college, with one role.

| Role | Can see | Can change |
| --- | --- | --- |
| `rider` | Routes, stops, today's trips and live positions of their college | Their own stop preference, alert setting and push token |
| `driver` | Everything a rider sees | Start and end their own assigned trips; upload positions for their active trip |
| `transport_admin` | Everything in their college, including members and invite codes | Routes, stops, buses, timetables, members' roles, invite codes |

A separate **platform admin** list (`platform_admins`) can see every college's counts on the Platform screen. It is filled from `ADMIN_EMAILS` with `npm run db:admins`.

## Rules enforced in the database

- A college always keeps at least one transport admin (`private.keep_one_admin` trigger).
- A trip's driver must be a driver in the same college (`private.check_driver_assignment`).
- A driver can have only one active trip at a time (partial unique index).
