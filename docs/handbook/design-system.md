# Design system

The look borrows from airport and bus-station **departure boards**: a near-black board with amber figures for the one number that matters, on a warm off-white page. Tokens live in `src/theme/tokens.ts`.

## Colour

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `bg` | `#F3F1EC` | `#0E0E0C` | Page |
| `ink` | `#121210` | `#F3F0E8` | Text |
| `accent` | `#FFB400` | `#FFB400` | The ETA, primary buttons, route ahead |
| `ontime` | `#17703A` | `#4BC27D` | On time |
| `late` | `#B8321A` | `#FF7559` | Late, destructive actions |

Light is the default: riders check the app outdoors, in the sun, at a bus stop.

## Type

One family, **Barlow** (500–800), chosen for its condensed, signage-like figures.

| Style | Size / line | Use |
| --- | --- | --- |
| `eta` | 88 / 88, extra bold | The minutes on the board |
| `display` | 44 / 44 | Screen titles |
| `title` | 22 / 28 | Card titles |
| `body` | 16 / 24 | Text |
| `label` | 14 / 20 | Buttons, field labels |
| `micro` | 12 / 16 uppercase | Board captions |

## Spacing, radius, touch

- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64.
- Radius: 6 (small), 12 (cards, buttons), 20 (sheets), pill.
- Every tappable element is at least 48 px.

## Motion

Under 200 ms for UI feedback; physics only where it means something (the bottom sheet's spring, the bus gliding along the road). Reduced-motion settings are respected.
