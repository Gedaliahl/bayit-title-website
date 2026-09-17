import type { Metadata } from 'next';
import Link from 'next/link';

import { getAllDocs, CLUSTER_LABELS } from '@/lib/content';
import { getFeaturedReviews, getReviewSnapshot, type Review } from '@/lib/reviews';
import { getCounties } from '@/lib/locations';
import { officeHoursLine, site } from '@/lib/site';
import { CountUp } from '@/components/CountUp';
import { ServicesTicker } from '@/components/ServicesTicker';
import { FileTimeline } from '@/components/FileTimeline';
import { FeaturedQuote } from '@/components/Reviews';

export const metadata: Metadata = {
  title: `Florida title insurance agency in ${site.address.city}`,
  description:
    `${site.legalName} searches title, issues policies as an agent for ${site.underwriter}, holds ` +
    `escrow and closes residential and commercial transactions throughout Florida. Excellent ` +
    `title work, done by four named people in Coral Springs: the search read by a person, ` +
    `problems put in writing the week they are found, the same processor and closer on your file ` +
    `from opening to recording.`,
  alternates: { canonical: '/' },
};

/**
 * The quote sits in two columns of a four-column strip, so a long review would
 * push it out of shape. Take the first review the office has featured that
 * fits — `getFeaturedReviews` already returns them in the site's own order —
 * rather than cutting a reviewer's words down to the space available.
 */
const QUOTE_BUDGET = 240;

function quotable(reviews: Review[]): Review | null {
  const withBody = reviews.filter((review) => review.body);
  return withBody.find((review) => (review.body?.length ?? 0) <= QUOTE_BUDGET) ?? withBody[0] ?? null;
}

export default async function HomePage() {
  const [docs, snapshot, counties, featured] = await Promise.all([
    getAllDocs('title-problems'),
    getReviewSnapshot(),
    getCounties(),
    getFeaturedReviews(),
  ]);

  const recent = docs.slice(0, 6);
  const quote = quotable(featured);

  return (
    <>
      <section className="section hero">
        <div className="frame hero__inner">
          <div>
            <h1>Got a Florida deal to close? We make the title and closing simple.</h1>
            <p className="hero__lede">
              We search title, examine what comes back, issue policies, hold the escrow and run
              the closing — anywhere in Florida. When something turns up on a file, we tell you
              what it is and what clearing it takes, in writing, the same day.
            </p>
            <p className="hero__actions">
              <Link href="/estimate" className="btn btn--primary">
                How much will it cost?
              </Link>
            </p>
          </div>

          <FileTimeline />
        </div>
      </section>

      <ServicesTicker />

      <section className="section figures">
        <div className="frame figures__grid">
          <div className="figure">
            <p className="figure__value">
              <CountUp value={site.floridaCounties} />
            </p>
            <p className="figure__label">Florida counties we close in</p>
          </div>

          {snapshot ? (
            <div className="figure">
              <p className="figure__value">
                <CountUp value={snapshot.averageRating} decimals={1} />
              </p>
              <p className="figure__label">
                Average rating across {snapshot.reviewCount} Google reviews
              </p>
            </div>
          ) : null}

          {quote ? <FeaturedQuote review={quote} /> : null}
        </div>
      </section>

      <section className="section section--band">
        <div className="frame measure">
          <h2 style={{ marginTop: 0 }}>Why bring the file here</h2>
          <p>
            Because the work is excellent, and excellence in title is a set of specific, checkable
            things rather than a claim. The search is read by a person who says out loud what the
            exceptions mean. A problem goes to you in writing the week it is found, with what it
            would take to clear, instead of surfacing at the closing table. The same processor and
            the same closer carry the file from opening through recording. The phone is answered by
            someone who already knows your file.
          </p>
          <p>
            None of that is a promise you have to take on trust. It is what our{' '}
            <Link href="/reviews">clients and their agents describe, in public, in their own words</Link>{' '}
            — reproduced here in full, unedited.
          </p>
          <p>
            <Link href="/partners">How we work with realtors and mortgage brokers →</Link>
          </p>
        </div>
      </section>

      <section className="frame section">
        <div className="section__head">
          <h2 style={{ marginTop: 0, marginBottom: 0 }}>Title problems, written out</h2>
          <Link href="/title-problems" className="section__head-link">
            All title problem pages →
          </Link>
        </div>

        <div className="measure">
          <p>
            Most title questions are specific: an open permit, a judgment against a seller, an
            estate that never closed, a parcel with no recorded access. These pages take one
            situation at a time and say what it is, whether it stops a closing, and what it takes
            to clear.
          </p>
        </div>

        {recent.length > 0 ? (
          <ul className="card-grid card-grid--three" style={{ marginTop: '1.5rem' }}>
            {recent.map((doc) => (
              <li key={doc.slug} className="card">
                <span className="chip">{CLUSTER_LABELS[doc.cluster]}</span>
                <h3>
                  <Link href={`/title-problems/${doc.slug}`}>{doc.title}</Link>
                </h3>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="section section--band">
        <div className="frame measure">
          <h2 style={{ marginTop: 0 }}>What we close</h2>
          <p>
            <strong>Residential purchases, sales and refinances</strong> — the everyday file, done
            properly.
          </p>
          <p>
            <strong>Commercial title.</strong> Office, retail, industrial, multifamily and vacant
            land: entity searches and authority documents, leasehold and ALTA policies, the
            endorsements a commercial lender asks for, UCC and judgment work against the entities on
            both sides, and escrow held to the terms the parties actually negotiated. A commercial
            file is not a residential file with a bigger number on it, and we do not staff it as if
            it were.
          </p>
          <p>
            <strong>1031 exchanges.</strong> We can facilitate a like-kind exchange through{' '}
            {site.exchangeCompany.name} — {site.exchangeCompany.relationship}, despite the shared
            name — so the qualified intermediary and the closing are arranged together rather than
            by two offices that have never spoken. It has to be set up before the relinquished
            property closes: once the seller has touched the money, the exchange is over. Tell us
            early and we will help you get the paperwork in the right order.{' '}
            <Link href="/services">More on all three →</Link>
          </p>
        </div>
      </section>

      <section className="frame section">
        <div className="measure">
          <h2 style={{ marginTop: 0 }}>Where we close</h2>
          <p>
            We close throughout Florida. Most of our files sit in{' '}
            {site.priorityCounties.slice(0, -1).join(', ')} and {site.priorityCounties.at(-1)},
            where who customarily pays for the owner&rsquo;s policy, what the clerk charges, and how
            long recording takes all differ by county.
          </p>
          <ul className="linklist">
            {counties.map((county) => (
              <li key={county.slug}>
                <Link href={`/counties/${county.slug}`}>{county.name}</Link>
              </li>
            ))}
          </ul>
          <p>
            Want a number before you call?{' '}
            <Link href="/estimate">Estimate from a property address</Link> or{' '}
            <Link href="/calculator">work it out from a price</Link>.
          </p>
        </div>
      </section>

      <section className="section section--band">
        <div className="frame measure">
          <h2 style={{ marginTop: 0 }}>How a signing can happen</h2>
          <ul>
            {site.closingMethods.map((method) => (
              <li key={method}>{method}</li>
            ))}
          </ul>
          <p className="muted ui" style={{ fontSize: '0.875rem' }}>
            Office hours are {officeHoursLine}. Signings outside those hours are arranged in
            advance, file by file.
          </p>
          <p>
            <Link href="/services">What we do →</Link>
          </p>
        </div>
      </section>
    </>
  );
}
