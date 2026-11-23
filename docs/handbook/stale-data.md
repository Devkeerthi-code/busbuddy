# Stale data

A wrong position shown confidently is worse than no position. BusBuddy is explicit about age:

- Every card shows **"updated N s ago"**, counting from the time the phone recorded the fix, not when it arrived.
- After **30 seconds** without a fix the board dims and the ETA is marked as an estimate (`isStale`).
- ETAs count down locally from the fix time between updates, so the number keeps moving instead of freezing.
- After an hour the label stops counting and says "updated over an hour ago".
- A trip with no fix for **30 minutes** is closed by the server ([scheduled jobs](cron-jobs.md)), so a dead phone never leaves a ghost bus on the map.
