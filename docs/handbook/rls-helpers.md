# RLS helpers

Policies call small SQL functions in the `private` schema instead of repeating subqueries:

| Function | Returns |
| --- | --- |
| `private.my_college()` | The caller's college id, or null |
| `private.is_member(college)` | Whether the caller belongs to that college |
| `private.is_admin_of(college)` | Whether the caller is that college's transport admin |
| `private.is_platform_admin()` | Whether the caller is on the platform admin list |

## Why this shape

- **`security definer`** lets the helper read `memberships` without the policy on `memberships` recursing into itself.
- **`set search_path = ''`** with fully qualified names means a user cannot shadow `public.memberships` with their own object.
- **`stable`** plus `(select auth.uid())` lets Postgres evaluate the user id once per statement instead of once per row, which keeps list queries fast.
- The `private` schema is not exposed through the API, and its tables are revoked from `anon` and `authenticated`; only `execute` on these four functions is granted.
