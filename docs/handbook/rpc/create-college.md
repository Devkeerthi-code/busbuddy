# create_college

```sql
public.create_college(p_name text, p_campus text, p_display_name text) returns uuid
```

**Who can call it:** Any signed-in user who is not yet in a college.

## What it does

- Creates the college, then a membership for the caller as `transport_admin` with their display name.
- Generates the student and driver invite codes.
- Returns the new college id.

## Errors

| Code | When |
| --- | --- |
| `not_signed_in` | No session |
| `already_member` | The caller already belongs to a college |

**Used by:** Set up your college screen.
