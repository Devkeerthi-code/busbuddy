# Sign in

**File:** `src/app/sign-in.tsx` · **For:** Everyone

Email and password sign-in and sign-up on one card.

## On the screen

- "I have an account" / "I'm new" switch.
- Email and password fields with inline validation (valid email, at least 8 characters).
- A line explaining that invite codes come after signing in and that location is only collected while driving.

## States

- Wrong password: "Email or password is wrong."
- Sign-up with email confirmation on: a "Check your email" card with Back to sign in.
- Button disabled while the request runs, so it cannot be submitted twice.
