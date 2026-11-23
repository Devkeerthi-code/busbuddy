# Driver

**File:** `src/app/driver/index.tsx` · **For:** Drivers (Android app)

One sentence about today's trip and one huge Start trip button.

## On the screen

- Start trip: starts sharing location and the foreground notification.
- While driving: "Sharing location", the next stop and stops done.
- Hold to end trip: a press-and-hold so it cannot be ended by a bump. The trip also ends by itself at the last stop.

## States

- On the web: "Driving needs the Android app".
- Location permission missing: explanation and Open settings.
- No signal: "Waiting for signal" while fixes queue.
- App reinstalled mid-trip: Resume sharing on this phone.
