'use client';

import { useEffect, useState } from 'react';

const DURATION = 2200;

/**
 * A figure that counts up once on load.
 *
 * It renders the final figure on the server and starts from zero only after
 * mounting, so a reader without JavaScript — and anything reading the HTML —
 * gets the number itself rather than a zero that never moves.
 */
export function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / DURATION);
      setShown(value * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    // The first frame sets the figure to zero. Starting the count here instead
    // would be a setState in the effect body, and a frame earlier buys nothing.
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{shown.toFixed(decimals)}</>;
}
