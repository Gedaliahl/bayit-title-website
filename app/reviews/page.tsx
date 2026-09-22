import type { Metadata } from 'next';

import { getReviews, getReviewSnapshot } from '@/lib/reviews';
import { unlistedReviewsNote } from '@/lib/review-order';
import { site } from '@/lib/site';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ReviewBrowser } from '@/components/ReviewBrowser';
import { ReviewSummaryLine } from '@/components/Reviews';
import { QuietCta } from '@/components/QuietCta';
import { baseOpenGraph, metaDescription } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Reviews',
  description: metaDescription(`What clients and agents have written about working with ${site.name} on Google.`),
  alternates: { canonical: '/reviews' },
  openGraph: { ...baseOpenGraph, url: '/reviews' },
};

export default async function ReviewsPage() {
  const [reviews, snapshot] = await Promise.all([getReviews(), getReviewSnapshot()]);
  const unlisted = unlistedReviewsNote(snapshot?.reviewCount ?? null, reviews.length);

  return (
    <div className="frame section">
      <div className="measure">
        <Breadcrumbs
          trail={[
            { name: 'Home', path: '/' },
            { name: 'Reviews', path: '/reviews' },
          ]}
        />
        <h1 className="after-crumbs">Reviews</h1>
        <p className="lede">
          These were left on our Google Business Profile. They are reproduced here in full, in the
          reviewer&rsquo;s own words, with nothing edited out.
        </p>
        {snapshot ? (
          <ReviewSummaryLine
            averageRating={snapshot.averageRating}
            reviewCount={snapshot.reviewCount}
          />
        ) : null}
        <p className="form-note">
          {unlisted ? `${unlisted} ` : ''}Some reviews carry no date: Google shows them with only a
          label such as &ldquo;12 weeks ago&rdquo;, and rather than print a date we would be
          guessing at, we print none. The order below can be changed; every review with text is in
          it.
        </p>

        {reviews.length > 0 ? (
          <ReviewBrowser reviews={reviews} />
        ) : (
          <p className="muted">
            Reviews load from our database of Google reviews at build time and are not available
            right now. They can be read on{' '}
            <a href={site.googleProfileUrl} rel="nofollow noopener">
              our Google profile
            </a>
            .
          </p>
        )}

        <QuietCta />
      </div>
    </div>
  );
}
