# rotate_invite_code

```sql
public.rotate_invite_code(p_role member_role) returns text
```

**Who can call it:** Transport admins.

## What it does

- Replaces the caller's college code for `rider` or `driver` with a fresh one and returns it. The old code stops working at once; existing members stay.

## Errors

| Code | When |
| --- | --- |
| `forbidden` | Not a transport admin |
| `bad_role` | Role is not rider or driver |

**Used by:** Setup → People → New code.
