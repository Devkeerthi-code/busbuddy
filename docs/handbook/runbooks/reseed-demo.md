# Reset the DEMO college

**When:** The demo data got messy before a presentation.

1. Run `npm run db:seed`. It recreates the DEMO college, its two routes, buses, timetable and four demo accounts with **new random passwords**, written to `.demo-accounts.local` (gitignored).
2. The invite codes change. Update the student code in `README.md` and `public/phone/index.html`, then push.
