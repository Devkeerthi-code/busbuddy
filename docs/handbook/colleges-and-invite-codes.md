# Colleges and invite codes

## Creating a college

Anyone signed in without a college can tap **Set up your college**. `create_college()` creates the college, makes the caller its transport admin and generates two invite codes: one for students and staff, one for drivers.

## Joining

People join with a six-character code on the **Which college do you travel with?** screen. `join_college()` looks up the code and adds the membership with the code's role.

- Codes use 31 characters with no `0/O`, `1/I/L`, because they are read aloud and typed on cheap keyboards.
- Spaces and dashes are removed and letters are uppercased before checking.
- A user may try at most 10 codes in 10 minutes. A wrong code returns no row instead of raising an error, so the attempt is still counted.

## Rotating

If a code leaks, a transport admin taps **New code** under Setup → People. `rotate_invite_code()` replaces it; the old code stops working immediately. Existing members are not affected.
