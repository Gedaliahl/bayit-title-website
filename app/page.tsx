import type { Metadata } from 'next';
import Link from 'next/link';

import { getAllDocs, CLUSTER_LABELS } from '@/lib/content';
import { getBestReviews, getReviewSnapshot } from '@/lib/reviews';
import { getCounties } from '@/lib/locations';
import { FLORIDA_CITIES } from '@/lib/florida-cities';
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
              {/* The two other things a visitor with a live deal wants: an exact
                  figure from a person, or the person. */}
              <Link href="/quote" className="btn btn--quiet btn--caps">
                Get a quote
              </Link>
            </p>
            <p className="hero__call">
              Or call <a href={`tel:${site.phone}`}>{site.phoneDisplay}</a>, {officeHoursLine}.
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

      {/* Below the fold, every section is the same two columns: the heading and
          what the section is about on the left, the thing itself on the right.
          See `.split` in globals.css; under 58rem it stacks. */}
      <section className="section section--band">
        <div className="frame split">
          <div className="split__head">
            <p className="eyebrow">Why us</p>
            <h2>Why bring the file here</h2>
            <p>Four things that happen on every file here, and that you can check.</p>
            <p className="split__link">
              <Link href="/partners">How we work with realtors and mortgage brokers →</Link>
            </p>
            <p className="split__link">
              <Link href="/about">More about {site.name} →</Link>
            </p>
          </div>

          <div className="split__body">
            <ul className="points">
              <li>
                <strong>The search is read by a person</strong> who says out loud what the
                exceptions mean.
              </li>
              <li>
                <strong>A problem goes to you in writing the week it is found</strong>, with what it
                would take to clear, instead of surfacing at the closing table.
              </li>
              <li>
                <strong>The same processor and the same closer</strong> carry the file from opening
                through recording.
              </li>
              <li>
                <strong>The phone is answered by someone who already knows your file.</strong>
              </li>
            </ul>
            <p className="split__note">
              None of that is a promise you have to take on trust. It is what our{' '}
              <Link href="/reviews">clients and their agents describe, in public, in their own words</Link>{' '}
              — reproduced here in full, unedited.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="frame split">
          <div className="split__head">
            <p className="eyebrow">Title problems</p>
            <h2>Title problems, written out</h2>
            <p>
              Most title questions are specific: an open permit, a judgment against a seller, an
              estate that never closed, a parcel with no recorded access. These pages take one
              situation at a time and say what it is, whether it stops a closing, and what it takes
              to clear.
            </p>
            <p className="split__link">
              <Link href="/title-problems">All title problem pages →</Link>
            </p>
          </div>

          {recent.length > 0 ? (
            <ul className="card-grid card-grid--two split__body">
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
        </div>
      </section>

      <section className="section section--band">
        <div className="frame split">
          <div className="split__head">
            <p className="eyebrow">Services</p>
            <h2>What we close</h2>
            <p>Residential, commercial and 1031 exchange files, each staffed for what it is.</p>
            <p className="split__link">
              <Link href="/services">More on all three →</Link>
            </p>
          </div>

          <ul className="split__body tiles">
            <li className="card">
              <h3>Residential purchases, sales and refinances</h3>
              <p>The everyday file, done properly.</p>
            </li>
            <li className="card">
              <h3>Commercial title</h3>
              <p>
                Office, retail, industrial, multifamily and vacant land: entity searches and
                authority documents, leasehold and ALTA policies, the endorsements a commercial
                lender asks for, UCC and judgment work against the entities on both sides, and
                escrow held to the terms the parties actually negotiated. A commercial file is not a
                residential file with a bigger number on it, and we do not staff it as if it were.
              </p>
            </li>
            <li className="card">
              <h3>1031 exchanges</h3>
              <p>
                We close the transaction alongside whichever qualified intermediary you choose. The
                exchange has to be set up before the relinquished property closes: once the seller
                has touched the money, it is over. Tell us early and we will help you get the
                paperwork in the right order. ({site.exchangeCompany.name}, despite the name, is{' '}
                {site.exchangeCompany.relationship} with no connection to us.)
              </p>
            </li>
          </ul>
        </div>
      </section>

      <section className="section">
        <div className="frame split">
          <div className="split__head">
            <p className="eyebrow">Counties</p>
            <h2>Where we close</h2>
            <p>
              We close throughout Florida. Most of our files sit in{' '}
              {site.priorityCounties.slice(0, -1).join(', ')} and {site.priorityCounties.at(-1)},
              where who customarily pays for the owner&rsquo;s policy, which office records the
              deed, and how long recording takes all differ by county.
            </p>
            <p className="split__link">
              Want a number before you call?{' '}
              <Link href="/estimate">Estimate from a property address</Link>,{' '}
              <Link href="/closing-costs/title-insurance-calculator">
                work the premium out from a price
              </Link>
              , or see{' '}
              <Link href="/closing-costs/who-pays-title-insurance">who pays for title insurance</Link>{' '}
              in your county.
            </p>
          </div>

          <div className="split__body">
            <ul className="linklist linklist--columns">
              {counties
                .filter((county) => county.isPriority)
                .map((county) => (
                  <li key={county.slug}>
                    <Link href={`/counties/${county.slug}`}>{county.name}</Link>
                  </li>
                ))}
              <li>
                <Link href="/counties">All {site.floridaCounties} counties →</Link>
              </li>
            </ul>
            {/* The cities are what most readers type — "title company Fort
                Lauderdale", not "Broward County" — and this is the one page
                every visit can reach them from. Only cities whose county has a
                page. */}
            <h3>Cities</h3>
            <ul className="linklist linklist--columns">
              {FLORIDA_CITIES.filter((city) => counties.some((county) => county.slug === city.countySlug)).map(
                (city) => (
                  <li key={city.slug}>
                    <Link href={`/cities/${city.slug}`}>{city.name}</Link>
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>
      </section>

      <section className="section section--band">
        <div className="frame split">
          <div className="split__head">
            <p className="eyebrow">Signings</p>
            <h2>How a signing can happen</h2>
            <p>
              Office hours are {officeHoursLine}. Signings outside those hours are arranged in
              advance, file by file.
            </p>
            <p className="split__link">
              <Link href="/services">What we do →</Link>
            </p>
          </div>

          <ol className="split__body tiles tiles--numbered">
            {site.closingMethods.map((method) => (
              <li key={method} className="card">
                <h3>{method}</h3>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
