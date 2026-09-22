'use client';

import { useEffect, useRef, useState } from 'react';

const DURATION = 2200;

/**
 * A figure that counts up once, when it comes into view.
 *
 * It renders the final figure on the server and starts from zero only once it
 * is on screen, so a reader without JavaScript — and anything reading the HTML
 * — gets the number itself rather than a zero that never moves, and a figure
 * below the fold is not spent counting where nobody sees it. A screen reader
 * is given the final figure alone: the count is for the eye, and read aloud it
 * would be a run of numbers that are not the answer.
 */
export function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [shown, setShown] = useState(value);
  const figure = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const element = figure.current;
    if (!element) return;

    let frame = 0;
    const count = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / DURATION);
        setShown(value * (1 - Math.pow(1 - progress, 3)));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      count();
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return (
    <>
      <span ref={figure} aria-hidden="true">
        {shown.toFixed(decimals)}
      </span>
      <span className="visually-hidden">{value.toFixed(decimals)}</span>
    </>
  );
}
