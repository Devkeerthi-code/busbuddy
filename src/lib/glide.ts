import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

const FRAME_MS = 50;
const JUMP_BEYOND_M = 3000;

/**
 * Smoothly moves a distance-along-route value from its previous reading to the new one
 * over roughly the time between GPS updates, so the bus glides along the road instead of
 * jumping. Runs at ~20 fps (cheap on low-end phones); jumps instantly with reduced motion.
 */
export function useGlide(target: number | null, durationMs = 4000): number | null {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  const reduceMotion = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        reduceMotion.current = v;
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (target === null) return;
    const start = from.current;
    const instant = start === null || reduceMotion.current || Math.abs(target - start) > JUMP_BEYOND_M;
    const t0 = Date.now();
    const id = setInterval(() => {
      const k = instant ? 1 : Math.min(1, (Date.now() - t0) / durationMs);
      const v = (start ?? target) + (target - (start ?? target)) * k;
      from.current = v;
      setValue(v);
      if (k >= 1) clearInterval(id);
    }, FRAME_MS);
    return () => clearInterval(id);
  }, [target, durationMs]);

  return target === null ? null : value;
}
