# `auth.tsx`

**File:** `src/lib/auth.tsx`

Session, membership and platform-admin state for the whole app.

- `AuthProvider` and `useAuth()`.
- Loads the membership with its college after sign-in. Supabase calls are deferred out of the auth callback, which runs while the auth lock is held.

See also: [roles.md](../roles.md)
