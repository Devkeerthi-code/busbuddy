# Running cost

BusBuddy runs entirely on free tiers for a college pilot:

| Part | Service | Cost for one college |
| --- | --- | --- |
| Database, auth, realtime, Edge Function, cron | Supabase free tier | ₹0 |
| Map tiles | OpenFreeMap (OpenStreetMap data) | ₹0, no key |
| Push notifications | Expo push service + Firebase Cloud Messaging | ₹0 |
| Android builds | EAS free tier (queued builds) | ₹0 |
| Web demo | GitHub Pages | ₹0 |

Things to watch:

- Supabase pauses free projects after a week without activity; a college using it daily never hits this.
- EAS free builds wait in a queue; fine for occasional releases.
- Past a handful of colleges, see [Scaling](scaling.md) for the first limits that need a paid plan.
