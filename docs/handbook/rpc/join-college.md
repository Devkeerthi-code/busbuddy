# join_college

```sql
public.join_college(p_code text, p_display_name text) returns table (college_id uuid, college_name text, role member_role)
```

**Who can call it:** Any signed-in user who is not yet in a college.

## What it does

- Records the attempt in `private.join_attempts`.
- Refuses after 10 attempts in 10 minutes.
- Normalises the code, looks it up and adds the membership with the code's role.
- Returns one row on success and **no row** for a wrong code, so the counted attempt is not rolled back by an exception.

## Errors

| Code | When |
| --- | --- |
| `not_signed_in` | No session |
| `too_many_attempts` | 10 tries in 10 minutes |
| `already_member` | Already in a college |

**Used by:** Which college do you travel with? screen. An empty result is shown as "That code didn't match any college".
