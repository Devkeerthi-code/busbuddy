# `push.ts`

**File:** `src/lib/push.ts`

Registers the phone for arrival alerts.

- `registerForArrivalAlerts(userId)` returns `registered`, `denied`, `unsupported` or `failed`.
- `push.web.ts` always returns `unsupported`, so the web explains instead of failing silently.

See also: [push-alerts.md](../push-alerts.md)
