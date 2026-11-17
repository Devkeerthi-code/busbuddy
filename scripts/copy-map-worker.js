// maplibre-gl loads its web worker from a URL next to its own module, which Metro does not
// serve. Copy it into public/ so Expo web (dev server and static export) serves it.
const { copyFileSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');

const from = join(__dirname, '..', 'node_modules', 'maplibre-gl', 'dist', 'maplibre-gl-worker.mjs');
const to = join(__dirname, '..', 'public', 'maplibre-gl-worker.mjs');
mkdirSync(join(__dirname, '..', 'public'), { recursive: true });
copyFileSync(from, to);
