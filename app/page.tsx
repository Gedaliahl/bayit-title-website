import type { Metadata } from 'next';
import Link from 'next/link';

import { getAllDocs, CLUSTER_LABELS } from '@/lib/content';
import { getReviewSnapshot } from '@/lib/reviews';
import { getCounties } from '@/lib/locations';
import { metaDescription } from '@/lib/seo';
import { officeHoursLine, site } from '@/lib/site';
import { ReviewSummaryLine } from '@/components/Reviews';

export const metadata: Metadata = {
  title: `Florida title insurance agency in ${site.address.city}`,
  description:
    `${site.legalName} searches title, issues policies as an agent for ${site.underwriter}, holds ` +
    `escrow and closes residential and commercial transactions throughout Florida. The premium is ` +
    `the same at every agency; the difference is the excellence of the work around it — which is ` +
    `why files come here rather than to another title company.`,
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
          <p className="eyebrow">Coral Springs, Florida · Residential and commercial</p>
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
        <div className="frame measure">
          <h2 style={{ marginTop: 0 }}>Why bring the file here</h2>
          <p>
            Florida title insurance premiums are promulgated. The Office of Insurance Regulation
            sets them by rule, every agency in the state charges the same premium for the same
            coverage, and no agency can discount it. So price is not what separates one title
            company from the next. The execution is — and ours is excellent.
          </p>
          <p>
            Excellence here is a set of specific, checkable things: the search read by a person who
            says out loud what the exceptions mean, a problem put in writing the week it is found
            rather than at the closing table, the same processor and the same closer on the file
            from opening to recording, and a phone that is answered by someone who knows your
            file&rsquo;s name. That is the reason a file comes to us instead of to another title
            company, and it is the reason our{' '}
            <Link href="/reviews">clients and their agents keep saying so in public</Link>.
          </p>
          <p>
            <Link href="/partners">How we work with realtors and mortgage brokers →</Link>
          </p>
        </div>
      </section>

      <section className="frame section">
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

        <div className="measure">
          <p style={{ marginTop: '2rem' }}>
            <Link href="/title-problems">All title problem pages →</Link>
          </p>
        </div>
      </section>

      <section className="section section--sage">
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
            {site.exchangeCompany.name}, so the qualified intermediary and the closing are arranged
            together instead of by two offices that have never spoken. It has to be set up before
            the relinquished property closes — once the seller has touched the money, the exchange
            is over. Tell us early and we will help you get the paperwork in the right order.{' '}
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

      <section className="section section--sage">
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
