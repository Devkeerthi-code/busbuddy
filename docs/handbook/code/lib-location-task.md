# `location-task.ts`

**File:** `src/lib/location-task.ts`

The driver's background location task and upload queue.

- Starts and stops the foreground location service for a trip.
- Queues fixes (max 300) and uploads batches of up to 50; stops on 403/409; drops a batch rejected with 400.

See also: [background-location.md](../background-location.md)
