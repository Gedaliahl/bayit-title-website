'use client';

import { useMemo, useState } from 'react';

import {
  DEFAULT_REVIEW_ORDER,
  REVIEW_ORDERS,
  isReviewOrder,
  sortReviews,
  type Review,
  type ReviewOrder,
} from '@/lib/review-order';
import { ReviewList } from '@/components/Reviews';

/**
 * The review list with a sort control over it.
 *
 * Every review is rendered whichever order is chosen — the control changes the
 * order and nothing else. It never filters, so no reader is shown a subset of
 * what the office publishes without being told.
 */
export function ReviewBrowser({ reviews }: { reviews: Review[] }) {
  const [order, setOrder] = useState<ReviewOrder>(DEFAULT_REVIEW_ORDER);

  const sorted = useMemo(() => sortReviews(reviews, order), [reviews, order]);
  const hint = REVIEW_ORDERS.find((entry) => entry.value === order)?.hint;

  return (
    <>
      <div className="field review-sort">
        <label htmlFor="review-order">Order</label>
        <select
          id="review-order"
          aria-describedby="review-order-hint"
          value={order}
          onChange={(event) => {
            const next = event.target.value;
            if (isReviewOrder(next)) setOrder(next);
          }}
        >
          {REVIEW_ORDERS.map((entry) => (
            <option key={entry.value} value={entry.value}>
              {entry.label}
            </option>
          ))}
        </select>
        <span className="field__hint" id="review-order-hint">
          {hint} All {reviews.length} are shown either way.
        </span>
      </div>

      <ReviewList reviews={sorted} />
    </>
  );
}
