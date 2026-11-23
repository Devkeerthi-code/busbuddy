# The bus is not moving on the map

**When:** Students say the bus is frozen.

1. Look at "updated N min ago" on the rider screen. Under a minute: the bus is probably stopped in traffic.
2. Admin fleet view: is the trip active? If not, the driver has not started it or it timed out after 30 minutes without a fix.
3. Ask the driver whether the "Sharing location" notification is showing. If not, they should open the app; it offers **Resume sharing on this phone**.
4. If the notification is there but positions do not arrive: battery optimisation is killing the app, or the phone has no data. Check the brand steps in the README.
5. Server side: Supabase → Edge Functions → ingest-position → Logs shows each upload and any 4xx reply.
