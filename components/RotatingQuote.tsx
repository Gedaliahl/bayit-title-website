'use client';

import Link from 'next/link';
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
  /** On its own as well as in `attribution`, for the dots' labels. */
  authorName: string;
  attribution: string;
}

/** Five seconds on each review. */
const HOLD_MS = 5_000;

/**
 * The review beside the figures on the homepage, rotating through the best
 * reviews the site has, with a dot per review under it and a link on to the
 * full set.
 *
 * Every quote is in the HTML and the first is marked current, so a reader
 * without JavaScript gets a review rather than a gap, and anything reading the
 * page reads real reviews. The rotation is held back for a reader who has asked
 * for less motion — they keep the first, which is also the best, and the dots
 * still take them to any of the others — and pauses while the pointer or the
 * keyboard focus is on the strip, so a review is never swapped out from under
 * someone mid-sentence. Clicking a dot stops the rotation for good: a reader
 * who has picked a review should not be moved off it five seconds later, and
 * that makes the dots the stop control the auto-advance needs.
 */
export function RotatingQuote({ quotes, holdMs = HOLD_MS }: { quotes: Quote[]; holdMs?: number }) {
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const [chosen, setChosen] = useState(false);

  useEffect(() => {
    if (quotes.length < 2 || held || chosen) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % quotes.length);
    }, holdMs);

    return () => clearInterval(timer);
  }, [quotes.length, held, chosen, holdMs]);

  const current = quotes[index];
  if (!current) return null;

  return (
    <div
      className="figures__quote"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      // Capture, because the focus lands on a dot rather than on this div.
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={() => setHeld(false)}
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

      <div className="quote-rotator__foot">
        {quotes.length > 1 ? (
          <div className="quote-rotator__dots" role="group" aria-label="Choose a review">
            {quotes.map((quote, position) => (
              <button
                key={quote.id}
                type="button"
                className={`quote-rotator__dot${
                  position === index ? ' quote-rotator__dot--current' : ''
                }`}
                aria-label={`Review from ${quote.authorName}`}
                aria-current={position === index ? 'true' : undefined}
                onClick={() => {
                  setIndex(position);
                  setChosen(true);
                }}
              />
            ))}
          </div>
        ) : null}

        {/* Five of ninety-two are on show here. The arrow reads the way every
            other onward link on the site does. */}
        <Link href="/reviews" className="quote-rotator__all">
          Read all Google reviews &rarr;
        </Link>
      </div>
    </div>
  );
}
