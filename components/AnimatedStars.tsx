'use client';

import { useEffect, useRef, useState } from 'react';

const STAGGER_MS = 110;

/**
 * The star run above the homepage quote, drawn one star at a time.
 *
 * The full run renders on the server, so a reader without JavaScript — and
 * anything reading the HTML — gets the rating rather than five blanks. Only
 * once JavaScript is running do the stars go dark, and they light up when the
 * figure strip actually reaches the viewport: the strip sits well below the
 * fold, so animating on load would spend the effect on nobody.
 */
export function AnimatedStars({ rating }: { rating: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  // 'static' is the server render, and the resting state for anyone who has
  // asked for less motion; 'armed' holds the run dark; 'lit' plays it.
  const [phase, setPhase] = useState<'static' | 'armed' | 'lit'>('static');

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (typeof IntersectionObserver === 'undefined') return;

    let observer: IntersectionObserver | undefined;

    // Arming on the next frame rather than in the effect body keeps the state
    // change out of render, the same way CountUp defers its first step. The
    // observer is started alongside it, so the run can never light before it
    // has gone dark.
    const frame = requestAnimationFrame(() => {
      setPhase('armed');

      observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          setPhase('lit');
          observer?.disconnect();
        },
        { threshold: 0.6 },
      );

      observer.observe(node);
    });

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, []);

  return (
    <span
      ref={ref}
      className={`review__stars${phase === 'static' ? '' : ` review__stars--${phase}`}`}
      aria-label={`${rating} out of 5 stars`}
    >
      {Array.from({ length: rating }, (_, index) => (
        <span
          key={index}
          className="review__star"
          aria-hidden="true"
          style={{ animationDelay: `${index * STAGGER_MS}ms` }}
        >
          ★
        </span>
      ))}
    </span>
  );
}
