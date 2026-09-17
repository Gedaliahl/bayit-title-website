import { AnimatedStars } from '@/components/AnimatedStars';
import type { Review } from '@/lib/reviews';
import { formatReviewDate } from '@/lib/seo';

function Stars({ rating }: { rating: number }) {
  return (
    <span className="review__stars" aria-label={`${rating} out of 5 stars`}>
      <span aria-hidden="true">{'★'.repeat(rating)}</span>
    </span>
  );
}

function Attribution({ review }: { review: Review }) {
  // Dates derived from relative labels ("12 weeks ago") are suppressed upstream
  // in lib/reviews.ts, so a null date here means "we don't know", not "no date".
  const date = formatReviewDate(review.publishedAt);
  return (
    <p className="review__attribution">
      <Stars rating={review.rating} /> {review.authorName}
      {date ? ` · ${date}` : ''} · Google review
    </p>
  );
}

export function ReviewList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) return null;

  return (
    <div>
      {reviews.map((review) => (
        <article key={review.id} className="review">
          {review.body ? <p className="review__body">{review.body}</p> : null}
          <Attribution review={review} />
        </article>
      ))}
    </div>
  );
}

/**
 * A single review pulled onto a library page because its topic tags matched.
 * Kept visually quiet — it is corroboration, not a sales panel.
 */
export function ReviewPullQuote({ review }: { review: Review }) {
  if (!review.body) return null;

  return (
    <figure className="review review--pull" style={{ borderTop: 'none', marginTop: '2rem' }}>
      <blockquote style={{ margin: 0, border: 0, padding: 0, fontStyle: 'normal' }}>
        <p className="review__body">{review.body}</p>
      </blockquote>
      <figcaption>
        <Attribution review={review} />
      </figcaption>
    </figure>
  );
}

/**
 * The review set beside the figures on the homepage. The stars belong to this
 * one review and are drawn above it for that reason — one at a time, as the
 * figure strip comes into view, so they land with the counts beside them; the
 * attribution line underneath follows the same rules as every other review on
 * the site.
 */
export function FeaturedQuote({ review }: { review: Review }) {
  if (!review.body) return null;

  const date = formatReviewDate(review.publishedAt);

  return (
    <figure className="figures__quote">
      <AnimatedStars rating={review.rating} />
      <blockquote>&ldquo;{review.body}&rdquo;</blockquote>
      <figcaption className="review__attribution">
        {review.authorName}
        {date ? ` · ${date}` : ''} · Google review
      </figcaption>
    </figure>
  );
}

/**
 * Plain count and average, stated as what it is: a Google rating.
 * No AggregateRating markup — see components/Schema.tsx.
 */
export function ReviewSummaryLine({
  averageRating,
  reviewCount,
}: {
  averageRating: number;
  reviewCount: number;
}) {
  return (
    <p className="ui muted" style={{ fontSize: '0.9375rem' }}>
      {averageRating.toFixed(1)} average across {reviewCount} Google reviews.
    </p>
  );
}
