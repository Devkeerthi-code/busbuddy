# Changelog

## 1.0.1 — 2026-11-23

Fixes
- Distances just under a kilometre read "1.0 km" instead of "1000 m".
- Delay is measured against the stop the first ETA belongs to, not the first stop in the list.
- A driver upload batch rejected as malformed is dropped instead of blocking every later fix.
- Leaving a college also forgets the saved stop, so no more alerts arrive.
- Sign-up confirmation links on the web demo return to the demo site.
- Plain-language messages for the route stop limit and invite role errors.

Added
- Phone-frame demo page, CI workflow, handbook and many more tests.

## 1.0.0 — 2026-11-23

First public version.

- Students: "Where's my bus?" answer with ETA, delay and last-updated time, live map with a gliding bus marker, one push alert when the bus is 5 minutes away.
- Drivers: one-button trips on Android with background location, automatic stop arrivals and departures.
- Transport office: live fleet view, routes and stops editor, buses, timetables, people and invite codes, 7-day trip history.
- Multi-college with invite codes and roles; row-level security everywhere.
- DEMO college with two simulated routes and a bus simulator.
- Web demo on GitHub Pages, including a phone-frame view.
