// How the Google reviews are ordered, and the shape of one.
//
// Kept out of lib/reviews.ts, which is `server-only`, so the sort can run in
// the browser when a reader changes the order on /reviews. Nothing here touches
// the database; it is arithmetic over rows that were already fetched.

export interface Review {
  id: string;
  authorName: string;
  rating: number;
  body: string | null;
  /** Null when the stored date was derived from a relative label and can't be trusted. */
  publishedAt: string | null;
  replyBody: string | null;
  topicTags: string[];
  teamMemberSlug: string | null;
  countySlug: string | null;
  isFeatured: boolean;
}

export type ReviewOrder = 'relevance' | 'recent' | 'detailed';

export const REVIEW_ORDERS: { value: ReviewOrder; label: string; hint: string }[] = [
  {
    value: 'relevance',
    label: 'Most useful first',
    hint: 'Reviews that describe an actual file, ahead of the ones that say “great service”.',
  },
  {
    value: 'recent',
    label: 'Most recent first',
    hint: 'Newest first. Reviews Google dates only as “a year ago” have no date to sort on and come last.',
  },
  {
    value: 'detailed',
    label: 'Longest first',
    hint: 'Purely by length, so the most detailed accounts are at the top.',
  },
];

export const DEFAULT_REVIEW_ORDER: ReviewOrder = 'relevance';

export function isReviewOrder(value: string): value is ReviewOrder {
  return REVIEW_ORDERS.some((order) => order.value === value);
}

const bodyLength = (review: Review) => review.body?.trim().length ?? 0;

/** Newest first, with the undated rows kept together at the end. */
function byDate(a: Review, b: Review): number {
  if (a.publishedAt && b.publishedAt) return b.publishedAt.localeCompare(a.publishedAt);
  if (a.publishedAt) return -1;
  if (b.publishedAt) return 1;
  return 0;
}

/**
 * The default order, and the reason this file exists.
 *
 * Ordering by date alone put "Shevy is great!" above a review that walks
 * through a judgment being cleared before a closing, because one of them
 * happened to be posted later — and forty of the ninety-two rows carry a date
 * we don't trust enough to print, so date was doing less work than it looked
 * like it was doing. What a reader wants first is a review that describes a
 * file: what came up, what was done, how it ended.
 *
 * So: anything the office has featured, then reviews with substance, then the
 * date. Length is a blunt proxy for substance, but it is an honest one — it
 * reorders reviews and never edits, truncates or hides one, and every review
 * that would ever have been shown is still shown.
 */
function byRelevance(a: Review, b: Review): number {
  if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;

  // Three buckets rather than raw length, so that a review twenty characters
  // longer than another does not outrank it on that alone and the date still
  // decides between comparable reviews.
  const bucket = (review: Review) => {
    const length = bodyLength(review);
    if (length >= 400) return 2;
    if (length >= 120) return 1;
    return 0;
  };

  const bucketed = bucket(b) - bucket(a);
  if (bucketed !== 0) return bucketed;

  if (a.rating !== b.rating) return b.rating - a.rating;

  return byDate(a, b);
}

/** A new array, ordered. The input is never mutated. */
export function sortReviews(reviews: Review[], order: ReviewOrder): Review[] {
  const sorted = [...reviews];

  switch (order) {
    case 'recent':
      return sorted.sort((a, b) => byDate(a, b) || bodyLength(b) - bodyLength(a));
    case 'detailed':
      return sorted.sort((a, b) => bodyLength(b) - bodyLength(a) || byDate(a, b));
    case 'relevance':
    default:
      return sorted.sort(byRelevance);
  }
}
