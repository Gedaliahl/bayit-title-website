// Build-time review fetch. Fails soft: if Supabase is unreachable or
// unconfigured, pages render without reviews rather than failing the build.
import 'server-only';

import { cache } from 'react';
import { getServiceClient } from './supabase';

import { DEFAULT_REVIEW_ORDER, sortReviews, type Review } from './review-order';

// Re-exported so a page can keep importing the review type from the module it
// gets reviews from. The ordering itself lives in ./review-order because the
// browser sorts too, and this module is server-only.
export type { Review, ReviewOrder } from './review-order';

export interface ReviewSnapshot {
  averageRating: number;
  reviewCount: number;
}

import type { Database } from './database.types';

type ReviewRow = Pick<
  Database['public']['Tables']['google_reviews']['Row'],
  | 'id'
  | 'author_name'
  | 'rating'
  | 'body'
  | 'published_at'
  | 'reply_body'
  | 'topic_tags'
  | 'team_member_slug'
  | 'county_slug'
  | 'is_featured'
  | 'date_is_approximate'
  | 'body_truncated'
>;

function toReview(row: ReviewRow): Review {
  return {
    id: row.id,
    authorName: row.author_name,
    rating: row.rating,
    body: row.body,
    // Forty rows had dates derived from "12 weeks ago" labels, two of which
    // contradict their own owner-reply dates. Print nothing rather than a guess.
    publishedAt: row.date_is_approximate ? null : row.published_at,
    replyBody: row.reply_body,
    topicTags: row.topic_tags ?? [],
    teamMemberSlug: row.team_member_slug,
    countySlug: row.county_slug,
    isFeatured: row.is_featured,
  };
}

// Must stay a single string literal: supabase-js infers the row type from the
// literal, and a concatenated string degrades to `string` and loses all typing.
const SELECT_COLUMNS =
  'id, author_name, rating, body, published_at, reply_body, topic_tags, team_member_slug, county_slug, is_featured, date_is_approximate, body_truncated' as const;

export const getReviews = cache(async (): Promise<Review[]> => {
  const supabase = getServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('google_reviews')
    .select(SELECT_COLUMNS)
    .eq('is_hidden', false)
    // A body cut off by Google's "View full review" link would be quoted out of
    // context. Hold those back until the full text is captured.
    .eq('body_truncated', false)
    .not('body', 'is', null)
    // Ordered again below. Postgres decides the tie-breaks it likes; the order
    // a reader sees is a decision of ours, and it is made in one place —
    // ./review-order — so that the page, the county pages and the partners
    // page cannot drift apart from each other.
    .order('is_featured', { ascending: false })
    .order('published_at', { ascending: false });

  if (error) {
    console.warn(`[reviews] fetch failed, rendering without reviews: ${error.message}`);
    return [];
  }

  return sortReviews(data.map(toReview), DEFAULT_REVIEW_ORDER);
});

export const getReviewSnapshot = cache(async (): Promise<ReviewSnapshot | null> => {
  const supabase = getServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('review_snapshot')
    .select('average_rating, review_count')
    .maybeSingle();

  if (error || !data) {
    if (error) console.warn(`[reviews] snapshot fetch failed: ${error.message}`);
    return null;
  }

  return {
    averageRating: Number(data.average_rating),
    reviewCount: Number(data.review_count),
  };
});

/**
 * Every topic tag the `google_reviews` rows carry, as read from the table on
 * 2026-09-22. A page's `review_tags` are matched against these by exact
 * string, so a tag written in a different form — `clearing-title` for
 * `title-clearing`, `ron` for `remote-closing` — matches nothing and the page
 * silently shows no review. A test holds every page's tags to this list; add
 * to it when the seeded rows gain a tag, never to make a page's tag pass.
 */
export const REVIEW_TOPIC_TAGS = [
  'after-hours', 'agent', 'attention-to-detail', 'buyer', 'clear-to-close', 'communication',
  'complicated', 'condo', 'coral-springs', 'delay', 'due-diligence', 'estoppel', 'fast-closing',
  'first-time-buyer', 'foreign-seller', 'guidance', 'industry-professional', 'investor',
  'judgments', 'lender', 'lender-coordination', 'lender-issues', 'liens', 'loans', 'long-term',
  'mobile-signing', 'notarization', 'notary', 'out-of-state-buyer', 'partner', 'pricing',
  'problem-solving', 'rating-only', 'referral', 'refinance', 'remote-closing', 'repeat-client',
  'responsiveness', 'seller', 'short', 'signing', 'signing-agent', 'south-florida',
  'title-clearing', 'title-commitment', 'volume',
] as const;

/**
 * Reviews whose topic tags overlap the page's `review_tags`, most specific first.
 * Used to pull a relevant review onto a library page automatically.
 */
export async function getReviewsByTags(tags: string[], limit = 2): Promise<Review[]> {
  if (tags.length === 0) return [];
  const all = await getReviews();

  return all
    .map((review) => ({
      review,
      overlap: review.topicTags.filter((tag) => tags.includes(tag)).length,
    }))
    .filter((entry) => entry.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, limit)
    .map((entry) => entry.review);
}

/**
 * The best reviews the site has, in its own order — anything the office has
 * featured first, then the reviews with substance behind them, which is what
 * `getReviews` already returns. The homepage rotates through the first few.
 *
 * `maxBodyLength` is a caller's space, not a rule about reviews: a review
 * longer than it is pushed to the back of the set rather than dropped, so a
 * caller asking for five still gets five when only two short ones exist. No
 * review is ever cut to fit.
 */
export async function getBestReviews({
  limit = 5,
  maxBodyLength,
}: { limit?: number; maxBodyLength?: number } = {}): Promise<Review[]> {
  const withBody = (await getReviews()).filter((review) => review.body);
  if (maxBodyLength === undefined) return withBody.slice(0, limit);

  const fits = (review: Review) => (review.body?.length ?? 0) <= maxBodyLength;

  return [...withBody.filter(fits), ...withBody.filter((review) => !fits(review))].slice(0, limit);
}
