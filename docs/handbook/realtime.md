# Realtime

Each trip has a private broadcast channel, `trip:<trip id>`. The admin fleet view listens on one `college:<college id>` channel instead of one per bus.

- **Sending**: `record_position()` calls `realtime.send()` inside the same transaction that saves the position, so riders never see a position that was rolled back.
- **Receiving**: the app subscribes with `config: { private: true }`. A policy on `realtime.messages` uses `realtime.topic()` to allow members of the trip's college only.
- **Payload**: progress, position, ETAs per stop, delay, last stop reached and the fix time. It is small (well under 1 KB) so the free tier's message quota goes far.
- **Fallback**: screens also refetch on a slow timer, because a mobile websocket can drop silently. Whichever is newer, the broadcast or the database row, wins.

Why broadcast instead of Postgres Changes? Postgres Changes checks RLS per subscriber per row change, which gets slow as riders grow; broadcast authorises once at join time.
