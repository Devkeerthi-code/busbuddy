# BusBuddy handbook

Short pages that explain how BusBuddy works and how to run it. Start with [Overview](overview.md).

## Concepts
- [Overview](overview.md) · [Glossary](glossary.md) · [Roles](roles.md)
- [Colleges and invite codes](colleges-and-invite-codes.md) · [Trip lifecycle](trip-lifecycle.md) · [Morning and evening runs](morning-and-evening.md)

## Architecture
- [Architecture](architecture.md) · [Data flow of one GPS fix](data-flow.md) · [Shared tracking core](shared-core.md)
- [Edge Function](edge-function.md) · [Realtime](realtime.md) · [Background location](background-location.md) · [Maps](maps.md) · [Offline behaviour](offline.md)

## Tracking algorithms
- [GPS filtering](gps-filtering.md) · [Route projection](route-projection.md) · [Roads that double back](u-turn-window.md)
- [Stop arrival](stop-arrival.md) · [Speed smoothing](speed-smoothing.md) · [ETA](eta.md) · [Blending with history](eta-history-blend.md)
- [Delay](delay.md) · [Push alerts](push-alerts.md) · [Gliding marker](glide.md) · [Stale data](stale-data.md)

## Database
- [Schema](schema.md) · [Security model](security-model.md) · [RLS helpers](rls-helpers.md) · [Migrations](migrations.md)
- [Data retention](retention.md) · [Scheduled jobs](cron-jobs.md) · [Usage counts](usage-tracking.md)
- RPCs: see [rpc/](rpc/README.md)

## Screens
- See [screens/](screens/README.md)

## Runbooks
- See [runbooks/](runbooks/README.md)

## Code
- [Code reference](code/README.md): one page per module, script and main component

## Project
- [Testing](testing.md) · [Design system](design-system.md) · [Accessibility](accessibility.md) · [Privacy](privacy.md)
- [Scaling](scaling.md) · [Running cost](cost.md) · [FAQ](faq.md)
