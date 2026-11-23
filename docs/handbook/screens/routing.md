# Opening the app

**File:** `src/app/index.tsx` · **For:** Everyone

Sends each person straight to the screen for their role, so nobody sees a menu first.

## On the screen

- No session → Sign in.
- Signed in, no college → Join (or Platform for platform admins).
- Driver → Driver screen; transport admin → Fleet view; everyone else → Where's my bus?

## States

- While the saved session loads, the splash screen stays up instead of flashing the sign-in form.
