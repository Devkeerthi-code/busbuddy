# Glossary

- **College**: one tenant. Every route, bus, trip and member belongs to exactly one college.
- **Member**: a user in a college with a role: rider, driver or transport admin.
- **Route**: a road shape (line) plus an ordered list of stops.
- **Stop**: a named point on a route with a sequence number (`seq`).
- **Trip template**: a timetable entry: route, bus, driver, period (morning or evening), weekdays and the time at each stop.
- **Trip**: one run of a template on one day. Created by `ensure_today_trips()`.
- **Fix**: one GPS reading: latitude, longitude, time, accuracy and optional speed.
- **Progress** (`along`): distance in metres along the route shape from its start.
- **Travel order**: the order the bus actually reaches stops; reversed for evening runs.
- **Breadcrumb**: a stored fix, kept every 30 seconds for 7 days, used for history and route shapes.
- **Stop event**: arrive, depart or skip, recorded once per stop per trip.
- **EWMA**: exponentially weighted moving average; how speed is smoothed.
- **Dwell**: time a bus waits at a stop; ETAs add 30 seconds per intermediate stop.
- **Hysteresis**: using a smaller radius to enter a stop (40 m) than to leave it (80 m) so arrivals do not flicker.
- **DEMO college**: a clearly labelled fictional college with simulated buses, for trying the app.
