import type { Metadata } from 'next';

import { getReviews, getReviewSnapshot } from '@/lib/reviews';
import { site } from '@/lib/site';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ReviewList, ReviewSummaryLine } from '@/components/Reviews';
import { QuietCta } from '@/components/QuietCta';

export const metadata: Metadata = {
  title: 'Reviews',
  description: `What clients and agents have written about working with ${site.name} on Google.`,
  alternates: { canonical: '/reviews' },
};

export default async function ReviewsPage() {
  const [reviews, snapshot] = await Promise.all([getReviews(), getReviewSnapshot()]);

  return (
    <div className="frame section">
      <div className="measure">
        <Breadcrumbs
          trail={[
            { name: 'Home', path: '/' },
            { name: 'Reviews', path: '/reviews' },
          ]}
        />
        <h1 style={{ marginTop: '1.5rem' }}>Reviews</h1>
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
          Some reviews carry no date. Google reports the older ones only as relative labels
          (&ldquo;a year ago&rdquo;), and rather than print a date we would be guessing at, we
          print none.
        </p>

        {reviews.length > 0 ? (
          <ReviewList reviews={reviews} />
        ) : (
          <p className="muted">
            Reviews load from our Google Business Profile at build time and are not available right
            now. They can be read on{' '}
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
