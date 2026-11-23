# Delay

Delay compares when the bus is predicted to reach its next stop with the timetable:

```
delay = (fix time + ETA to next stop) − scheduled time at that stop
```

Positive means late. The board shows:

| Delay | Label |
| --- | --- |
| 2 min or more | "N min late" |
| between −3 and +2 min | "On time" |
| 3 min or more early | "N min early" |
| no timetable | "No schedule" |

The "next stop" is the stop the first ETA belongs to. Stops behind the bus have no ETA, so pairing by position in the list could compare one stop's ETA with another stop's timetable; `tests/core/tracker.test.ts` guards this.
