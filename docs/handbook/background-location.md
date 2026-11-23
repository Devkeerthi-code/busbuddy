# Background location

Drivers put the phone in a holder and forget it, so location must keep flowing with the screen off.

## Setup

- `expo-location` `startLocationUpdatesAsync` with high accuracy, a fix every ~5 s, and an Android **foreground service** notification ("Sharing location"). Android requires that notification for background location and it tells the driver sharing is on.
- The task is defined with `expo-task-manager` at module scope in `src/lib/location-task.ts`, so Android can start it even when the JavaScript UI is not loaded.

## Queue and upload

- Fixes go into a persistent queue (AsyncStorage, at most 300, oldest dropped first).
- Upload every 10 s once the bus moved more than 15 m, or every 20 s as a heartbeat while waiting.
- Batches of up to 50 fixes; the server de-duplicates, so retries are safe.
- A rejected (malformed) batch is dropped so it cannot block later fixes.

## Permissions

The driver must choose **Allow all the time**. If they don't, the Start screen explains why and offers **Open settings**. Aggressive battery savers still kill the service on some brands; see the README's battery section.
