# Maps

| Platform | Library |
| --- | --- |
| Android | `@maplibre/maplibre-react-native` |
| Web | `maplibre-gl` |

Both use free **OpenFreeMap** vector tiles (OpenStreetMap data): the Positron style in light mode and a dark style in dark mode. No API key, no per-request billing.

## Keeping the map calm

The base style is trimmed in `src/components/map/style.ts`: points of interest, most labels and other noisy layers are removed, so the route line, stops and bus marker stand out.

## One component, two files

`BusMap.tsx` (native) and `BusMap.web.tsx` (web) share props from `map/types.ts`. Metro picks the right file per platform, so screens never branch on the platform.

## Web worker

MapLibre GL needs its worker script served from the same origin. `scripts/copy-map-worker.js` copies it into `public/` on install and the web map points `setWorkerUrl` at it.
