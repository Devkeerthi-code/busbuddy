# Offline behaviour

College routes pass through patchy coverage. What happens without a network:

**Driver**
- Fixes keep being recorded and queued (up to 300, about 25 minutes at one fix every 5 s).
- When the network returns, the queue uploads in batches; arrivals and ETAs catch up because fixes keep their original timestamps.
- The driver screen shows "Waiting for signal" instead of an error.

**Rider**
- The last known answer stays on screen with its "updated N min ago" label, dimmed once stale.
- Actions that need the server show "Can't reach BusBuddy. Check your internet connection." with a **Try again** button.

**Sign-in**
- The session is stored on the device, so the app opens straight to the rider's bus without a network round trip.
