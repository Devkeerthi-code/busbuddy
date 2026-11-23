# GPS filtering

Phone GPS is noisy: indoors, under flyovers and between tall buildings a fix can be hundreds of metres off. `checkFix()` in `core/jitter.ts` drops a fix when:

| Reason | Rule | Default |
| --- | --- | --- |
| `invalid` | Latitude/longitude out of range or not a number, or no timestamp | — |
| `low_accuracy` | Reported accuracy radius is missing or larger than the limit | 50 m |
| `stale` | Timestamp is not later than the last accepted fix (out-of-order upload, duplicate) | — |
| `impossible_jump` | Moved more than 25 m **and** faster than the limit since the last fix | 33 m/s (~120 km/h) |

The 25 m wobble allowance matters: two fixes a second apart that differ by 10 m would otherwise look like 36 km/h of sideways speed.

Rejected fixes never change the tracker state, so one bad reading cannot move the bus. Tests: `tests/core/jitter*.test.ts`.
