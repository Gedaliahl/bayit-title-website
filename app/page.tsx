import type { Metadata } from 'next';
import Link from 'next/link';

import { getAllDocs, CLUSTER_LABELS } from '@/lib/content';
import { getBestReviews, getReviewSnapshot } from '@/lib/reviews';
import { getCounties } from '@/lib/locations';
import { officeHoursLine, site } from '@/lib/site';
import { baseOpenGraph } from '@/lib/seo';
import { CountUp } from '@/components/CountUp';
import { ServicesTicker } from '@/components/ServicesTicker';
import { FileTimeline } from '@/components/FileTimeline';
import { FeaturedQuote } from '@/components/Reviews';
import { UnderwriterBadge } from '@/components/UnderwriterBadge';
import { WebSiteSchema } from '@/components/Schema';

export const metadata: Metadata = {
  // Absolute, because the layout's "| Bayit Title" template applies only to the
  // segments below it; without the name here the homepage's title had none.
  title: { absolute: `${site.name} — Florida title company in ${site.address.city}` },
  description:
    `${site.legalName}, a Florida title company in ${site.address.city}: title search and ` +
    'insurance, escrow, and residential and commercial closings in all 67 counties.',
  alternates: { canonical: '/' },
  openGraph: { ...baseOpenGraph, url: '/' },
};

/**
 * The quote sits in two columns of a four-column strip, so a long review would
 * push it out of shape: ask for the reviews that fit rather than cutting a
 * reviewer's words down to the space available. The strip rotates through the
 * best eighteen — see components/RotatingQuote.tsx for the four seconds each
 * and the dot per review under the quote.
 */
const QUOTE_BUDGET = 240;
const QUOTE_COUNT = 18;

export default async function HomePage() {
  const [docs, snapshot, counties, quotes] = await Promise.all([
    getAllDocs('title-problems'),
    getReviewSnapshot(),
    getCounties(),
    getBestReviews({ limit: QUOTE_COUNT, maxBodyLength: QUOTE_BUDGET }),
  ]);

  const recent = docs.slice(0, 6);

  return (
    <>
      <WebSiteSchema />
      <section className="section hero">
        <div className="frame hero__inner">
          <div>
            {/* The line above the hook is what the page is searched for by. It is
                inside the heading, so the h1 says "Florida title company" as
                well as the question a reader arrives with. */}
            <h1>
              <span className="eyebrow hero__eyebrow">
                Florida title company in {site.address.city}
              </span>
              Got a Florida deal to close? We make the title and closing simple.
            </h1>
            <p className="hero__lede">
              We search title, examine what comes back, issue policies, hold the escrow and run
              the closing — anywhere in Florida. When something turns up on a file, we tell you
              what it is and what clearing it takes, in writing, the same day.
            </p>
            <p className="hero__actions">
              <Link href="/estimate" className="btn btn--primary btn--icon btn--caps">
                <svg
                  className="btn__icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="4" y="3" width="16" height="18" rx="4" />
                  <path d="M8 8h8" />
                  <path d="M9 13h0M15 13h0M9 17h0M15 17h0" />
                </svg>
                What&rsquo;s the cost?
                <svg
                  className="btn__icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 12h15" />
                  <path d="M13 6l6 6-6 6" />
                </svg>
              </Link>
            </p>
          </div>

          <FileTimeline />
        </div>
      </section>

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

          <FeaturedQuote reviews={quotes} />
        </div>

        {/* The section's width and gutter live on `frame`, which the grid above
            carries; the credit needs its own. */}
        <div className="frame">
          <UnderwriterBadge />
        </div>
      </section>

      <ServicesTicker />

      <section className="section section--band">
        <div className="frame measure">
          <h2 className="flush-top">Why bring the file here</h2>
          <p>
            The search is read by a person who says out loud what the exceptions mean. A problem goes to you in writing the week it is found, with what it
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
          <h2>Title problems, written out</h2>
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
          <ul className="card-grid card-grid--three after-intro">
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
          <h2 className="flush-top">What we close</h2>
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
            <strong>1031 exchanges.</strong> We close the transaction alongside whichever qualified
            intermediary you choose. The exchange has to be set up before the relinquished
            property closes: once the seller has touched the money, it is over. Tell us early and we
            will help you get the paperwork in the right order. ({site.exchangeCompany.name},
            despite the name, is {site.exchangeCompany.relationship} with no connection to us.){' '}
            <Link href="/services">More on all three →</Link>
          </p>
        </div>
      </section>

      <section className="frame section">
        <div className="measure">
          <h2 className="flush-top">Where we close</h2>
          <p>
            We close throughout Florida. Most of our files sit in{' '}
            {site.priorityCounties.slice(0, -1).join(', ')} and {site.priorityCounties.at(-1)},
            where who customarily pays for the owner&rsquo;s policy, which office records the deed,
            and how long recording takes all differ by county.
          </p>
          <ul className="linklist">
            {counties
              .filter((county) => county.isPriority)
              .map((county) => (
                <li key={county.slug}>
                  <Link href={`/counties/${county.slug}`}>{county.name}</Link>
                </li>
              ))}
            <li>
              <Link href="/counties">All {site.floridaCounties} counties</Link>
            </li>
          </ul>
          <p>
            Want a number before you call?{' '}
            <Link href="/estimate">Estimate from a property address</Link> or{' '}
            <Link href="/estimate?mode=numbers">work it out from a price</Link>.
          </p>
        </div>
      </section>

      <section className="section section--band">
        <div className="frame measure">
          <h2 className="flush-top">How a signing can happen</h2>
          <ul>
            {site.closingMethods.map((method) => (
              <li key={method}>{method}</li>
            ))}
          </ul>
          <p className="muted ui text-small">
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
