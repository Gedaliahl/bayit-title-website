// Build-time review fetch. Fails soft: if Supabase is unreachable or
// unconfigured, pages render without reviews rather than failing the build.
import 'server-only';

import { cache } from 'react';
import { getServiceClient } from './supabase';

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
    .order('is_featured', { ascending: false })
    .order('published_at', { ascending: false });

  if (error) {
    console.warn(`[reviews] fetch failed, rendering without reviews: ${error.message}`);
    return [];
  }

  return data.map(toReview);
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

export async function getFeaturedReviews(limit = 3): Promise<Review[]> {
  const all = await getReviews();
  return all.filter((review) => review.isFeatured).slice(0, limit);
}
