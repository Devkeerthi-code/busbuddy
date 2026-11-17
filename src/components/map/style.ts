import type { StyleSpecification } from '@maplibre/maplibre-react-native';
import { useEffect, useState } from 'react';
import { mapStyles } from '@/theme/tokens';

const cache = new Map<string, Promise<StyleSpecification>>();

/**
 * The OpenFreeMap styles include US highway shields and texture patterns that reference
 * data/sprites they don't ship, which floods the console with warnings. A bus map needs
 * neither, so those layers are dropped once and the cleaned style is cached.
 */
function isNoise(layer: { id: string; paint?: object }): boolean {
  return layer.id.startsWith('highway-shield') || (!!layer.paint && 'fill-pattern' in layer.paint);
}

function loadStyle(url: string): Promise<StyleSpecification> {
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url)
        .then((r) => {
          if (!r.ok) throw new Error(`map style ${r.status}`);
          return r.json() as Promise<StyleSpecification>;
        })
        .then((style) => ({ ...style, layers: style.layers.filter((l) => !isNoise(l as { id: string; paint?: object })) }))
        .catch((error) => {
          cache.delete(url);
          throw error;
        }),
    );
  }
  return cache.get(url)!;
}

/** Cleaned style for the current theme; falls back to the raw URL if the fetch fails. */
export function useMapStyle(isDark: boolean): StyleSpecification | string | null {
  const url = isDark ? mapStyles.dark : mapStyles.light;
  const [loaded, setLoaded] = useState<{ url: string; style: StyleSpecification | string } | null>(null);

  useEffect(() => {
    let active = true;
    loadStyle(url).then(
      (style) => active && setLoaded({ url, style }),
      () => active && setLoaded({ url, style: url }),
    );
    return () => {
      active = false;
    };
  }, [url]);

  return loaded?.url === url ? loaded.style : null;
}

/** Keeps the fitted route visible above a bottom sheet without asking for more room than the map has. */
export function fitPadding(mapHeight: number, bottomInset: number) {
  const top = 64;
  const bottom = Math.max(24, Math.min(bottomInset + 24, mapHeight - top - 120));
  return { top, left: 32, right: 32, bottom };
}
