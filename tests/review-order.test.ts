/**
 * The review ordering.
 *
 * The rule that matters here is what the sort is NOT allowed to do: it reorders
 * and never removes. A control that quietly dropped the short reviews would be
 * editing the Google profile on the page, which is exactly what the reviews
 * page promises it does not do.
 */
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_REVIEW_ORDER,
  REVIEW_ORDERS,
  isReviewOrder,
  sortReviews,
  type Review,
} from '@/lib/review-order';

function review(overrides: Partial<Review> & { id: string }): Review {
  return {
    authorName: 'A. Reviewer',
    rating: 5,
    body: 'Fine.',
    publishedAt: null,
    replyBody: null,
    topicTags: [],
    teamMemberSlug: null,
    countySlug: null,
    isFeatured: false,
    ...overrides,
  };
}

const short = review({ id: 'short', body: 'Shevy is great!', publishedAt: '2026-05-01' });
const long = review({
  id: 'long',
  body: 'x'.repeat(600),
  publishedAt: '2023-01-01',
});
const middling = review({ id: 'middling', body: 'y'.repeat(200), publishedAt: '2024-06-01' });
const featured = review({ id: 'featured', body: 'Brief but featured.', isFeatured: true });
const undated = review({ id: 'undated', body: 'z'.repeat(300), publishedAt: null });

const all = [short, long, middling, featured, undated];

describe('every order shows every review', () => {
  it.each(REVIEW_ORDERS.map((order) => order.value))('keeps all of them in %s', (order) => {
    const sorted = sortReviews(all, order);
    expect(sorted).toHaveLength(all.length);
    expect(new Set(sorted.map((entry) => entry.id))).toEqual(
      new Set(all.map((entry) => entry.id)),
    );
  });

  it('does not mutate what it is given', () => {
    const input = [...all];
    sortReviews(input, 'detailed');
    expect(input.map((entry) => entry.id)).toEqual(all.map((entry) => entry.id));
  });
});

describe('the default order', () => {
  it('leads with a featured review whatever its length', () => {
    expect(sortReviews(all, DEFAULT_REVIEW_ORDER)[0].id).toBe('featured');
  });

  it('puts a review that describes a file above one that says “great”', () => {
    const ids = sortReviews(all, 'relevance').map((entry) => entry.id);
    expect(ids.indexOf('long')).toBeLessThan(ids.indexOf('short'));
    expect(ids.indexOf('middling')).toBeLessThan(ids.indexOf('short'));
  });
});

describe('ordering by date', () => {
  it('is newest first, with the undateable reviews last', () => {
    const ids = sortReviews(all, 'recent').map((entry) => entry.id);
    expect(ids.indexOf('short')).toBeLessThan(ids.indexOf('middling'));
    expect(ids.indexOf('middling')).toBeLessThan(ids.indexOf('long'));
    // 'featured' and 'undated' both carry no trustworthy date.
    expect(ids.slice(-2).sort()).toEqual(['featured', 'undated']);
  });
});

describe('ordering by length', () => {
  it('is longest first', () => {
    expect(sortReviews(all, 'detailed').map((entry) => entry.id)).toEqual([
      'long',
      'undated',
      'middling',
      'featured',
      'short',
    ]);
  });
});

describe('reading an order off a select', () => {
  it('accepts the orders it offers and nothing else', () => {
    expect(isReviewOrder('relevance')).toBe(true);
    expect(isReviewOrder('rating')).toBe(false);
    expect(isReviewOrder('')).toBe(false);
  });
});
