import type { Metadata } from 'next';
import Link from 'next/link';

import { getAllDocs, CLUSTER_LABELS } from '@/lib/content';
import { getReviewSnapshot } from '@/lib/reviews';
import { getCounties } from '@/lib/locations';
import { metaDescription } from '@/lib/seo';
import { site } from '@/lib/site';
import { ReviewSummaryLine } from '@/components/Reviews';

export const metadata: Metadata = {
  title: `Florida title insurance agency in ${site.address.city}`,
  description:
    `${site.legalName} searches title, issues policies as an agent for ${site.underwriter}, holds ` +
    `escrow and closes transactions throughout Florida. Coral Springs office; in-office, mobile ` +
    `and remote online signings.`,
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  const [docs, snapshot, counties] = await Promise.all([
    getAllDocs('title-problems'),
    getReviewSnapshot(),
    getCounties(),
  ]);

  const recent = docs.slice(0, 6);

  return (
    <>
      <section className="frame section">
        <div className="measure">
          <p className="eyebrow">Coral Springs, Florida · Since {site.founded}</p>
          <h1>A title agency that tells you what the search actually says.</h1>
          <p className="lede">
            We search title, examine what comes back, issue policies as an agent for{' '}
            {site.underwriter}, hold the escrow and run the closing — anywhere in Florida. When
            something turns up on a file, we tell you what it is and what clearing it takes, in
            writing, the same week.
          </p>
          <p style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.75rem' }}>
            <Link href="/order" className="btn btn--primary">
              Open a title order
            </Link>
            <Link href="/quote" className="btn btn--quiet">
              Request a quote
            </Link>
          </p>
          {snapshot ? (
            <ReviewSummaryLine
              averageRating={snapshot.averageRating}
              reviewCount={snapshot.reviewCount}
            />
          ) : null}
        </div>
      </section>

      <section className="section section--sage">
        <div className="frame">
          <div className="measure">
            <h2 style={{ marginTop: 0 }}>Title problems, written out</h2>
            <p>
              Most title questions are specific: an open permit, a judgment against a seller, an
              estate that never closed, a parcel with no recorded access. These pages take one
              situation at a time and say what it is, whether it stops a closing, and what it takes
              to clear.
            </p>
          </div>

          {recent.length > 0 ? (
            <ul className="card-grid" style={{ marginTop: '2rem' }}>
              {recent.map((doc) => (
                <li key={doc.slug} className="card">
                  <h3>
                    <Link href={`/title-problems/${doc.slug}`}>{doc.title}</Link>
                  </h3>
                  <p>{metaDescription(doc.summary ?? doc.direct_answer, 150)}</p>
                  <p className="card__meta">{CLUSTER_LABELS[doc.cluster]}</p>
                </li>
              ))}
            </ul>
          ) : null}

          <p style={{ marginTop: '2rem' }}>
            <Link href="/title-problems">All title problem pages →</Link>
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
        </div>
      </section>

      <section className="section section--sage">
        <div className="frame measure">
          <h2 style={{ marginTop: 0 }}>How a signing can happen</h2>
          <ul>
            {site.closingMethods.map((method) => (
              <li key={method}>{method}</li>
            ))}
          </ul>
          <p className="muted ui" style={{ fontSize: '0.875rem' }}>
            Office hours are {site.hours[0].days} {site.hours[0].open} to {site.hours[0].close}, and{' '}
            {site.hours[1].days} {site.hours[1].open} to {site.hours[1].close}. Signings outside
            those hours are arranged in advance, file by file.
          </p>
          <p>
            <Link href="/services">What we do →</Link>
          </p>
        </div>
      </section>
    </>
  );
}
