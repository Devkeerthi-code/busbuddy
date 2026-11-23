# Overview

College buses run fixed routes twice a day, but students cannot see where the bus is. They leave early and wait at the roadside, or miss it and call friends to ask. BusBuddy answers one question: **where is my bus and when will it reach my stop?**

## Three kinds of user

| Who | Device | What they do |
| --- | --- | --- |
| Student or staff rider | Phone (Android app or web) | Picks a route and stop once; then sees the ETA, delay and the live map. Can get one alert at 5 minutes. |
| Driver | Android phone | Taps **Start trip**. The phone shares location in the background until the last stop. |
| Transport office | Laptop or phone | Sets up routes, stops, buses and timetables, shares invite codes, watches the fleet. |

## How it fits together

1. The driver's phone records a GPS fix every few seconds and uploads small batches.
2. The `ingest-position` Edge Function filters bad fixes, snaps the bus to the route, detects stops and computes ETAs.
3. It stores the result on the trip and broadcasts it on the trip's private realtime channel.
4. Riders' screens update within a second and the marker glides along the road.

See [Architecture](architecture.md) for the diagram.
