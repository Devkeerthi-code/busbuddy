# Join a college

**File:** `src/app/join.tsx` · **For:** Signed-in people without a college

Asks "Which college do you travel with?" and takes the invite code and the person's name.

## On the screen

- Invite code field (spaces, dashes and lowercase are fixed automatically).
- Your name, shown to the transport office.
- Join college, plus "Set up your college" for a new transport office, and Sign out.

## States

- Wrong code, too many tries and already-a-member each get a plain message.
- Success shows "Joined <college>" and opens the right screen for the role.
