'use client';

import { useEffect, useState } from 'react';

import { AnimatedStars } from '@/components/AnimatedStars';

/**
 * One review, already reduced to the strings the strip prints. The date is
 * formatted on the server — `formatReviewDate` reads the machine's timezone,
 * and a date formatted again in the browser can land on a different day than
 * the one in the HTML.
 */
export interface Quote {
  id: string;
  rating: number;
  body: string;
  attribution: string;
}

/** Ten seconds on each review. */
const HOLD_MS = 10_000;

/**
 * The review beside the figures on the homepage, rotating through the best
 * reviews the site has.
 *
 * Every quote is in the HTML and the first is marked current, so a reader
 * without JavaScript gets a review rather than a gap, and anything reading the
 * page reads real reviews. The rotation is held back for a reader who has asked
 * for less motion — they keep the first, which is also the best — and pauses
 * while the pointer is over the quote, so a review is never swapped out from
 * under someone mid-sentence.
 */
export function RotatingQuote({ quotes, holdMs = HOLD_MS }: { quotes: Quote[]; holdMs?: number }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (quotes.length < 2 || paused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % quotes.length);
    }, holdMs);

    return () => clearInterval(timer);
  }, [quotes.length, paused, holdMs]);

  const current = quotes[index];
  if (!current) return null;

  return (
    <div
      className="figures__quote"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatedStars rating={current.rating} />

      {/* All of the quotes sit in one grid cell, so the strip is as tall as the
          longest of them and no rotation moves the page under the reader. */}
      <div className="quote-rotator">
        {quotes.map((quote, position) => {
          const showing = position === index;
          return (
            <figure
              key={quote.id}
              className={`quote-rotator__slide${showing ? ' quote-rotator__slide--current' : ''}`}
              aria-hidden={showing ? undefined : true}
            >
              <blockquote>&ldquo;{quote.body}&rdquo;</blockquote>
              <figcaption className="review__attribution">{quote.attribution}</figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}
