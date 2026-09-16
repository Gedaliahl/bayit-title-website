import type { Metadata } from 'next';
import Link from 'next/link';

import { getAllDocs } from '@/lib/content';
import { metaDescription } from '@/lib/seo';
import { officeHoursLine, site } from '@/lib/site';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { QuietCta } from '@/components/QuietCta';

export const metadata: Metadata = {
  title: 'Services',
  description:
    'Title search and examination, title insurance, settlement and escrow, commercial title, and ' +
    '1031 exchanges facilitated through Bayit Exchange Company — with closings held in our ' +
    'office, wherever the signer is, or online, throughout Florida.',
  alternates: { canonical: '/services' },
};

export default async function ServicesIndex() {
  const docs = await getAllDocs('services');

  return (
    <div className="frame section">
      <div className="measure">
        <Breadcrumbs
          trail={[
            { name: 'Home', path: '/' },
            { name: 'Services', path: '/services' },
          ]}
        />
        <h1 style={{ marginTop: '1.5rem' }}>What we do</h1>
        <p className="lede">
          We search title, examine what the search returns, issue commitments and policies as an
          agent for {site.underwriter}, hold the escrow, and run the closing. Every file is worked
          by the same four people, in {site.address.city}, and the standard we hold it to is
          excellence — read by a person, raised early, and in writing.
        </p>

        <h2>Residential closings</h2>
        <p>
          Purchases, sales, refinances, new construction, condominium and HOA files, cash closings,
          out-of-state and foreign sellers. The search is ordered the day the file opens, read by a
          person, and anything that could hold up the closing goes to you in writing with what it
          would take to clear — not saved for the table.
        </p>

        <h2>Commercial title</h2>
        <p>
          We close commercial transactions as well: office, retail, industrial, multifamily and
          vacant land, for purchases, sales and financings. A commercial file is not a residential
          file with a larger number on it, and the extra work is the point of hiring someone who
          does it regularly:
        </p>
        <ul>
          <li>
            Entity work — corporate, partnership and LLC searches, good standing, authority
            documents, and the resolutions or consents the underwriter will want before it insures
            a signature.
          </li>
          <li>
            The right policy and endorsements: ALTA owner&rsquo;s and loan policies, leasehold
            coverage, and the endorsement set a commercial lender asks for, quoted line by line
            rather than bundled.
          </li>
          <li>
            UCC, judgment and lien searches against the entities and principals on both sides, plus
            the tax, assessment and permit questions that come with income-producing property.
          </li>
          <li>
            Escrow and settlement held to the terms the parties actually negotiated — holdbacks,
            staged disbursement, multiple lenders, assignment of leases and rents.
          </li>
        </ul>
        <p>
          Send us the contract and the entity names early. Authority documents and estoppels are
          the two things that most often decide whether a commercial closing holds its date.
        </p>

        <h2>1031 exchanges, through {site.exchangeCompany.name}</h2>
        <p>
          A like-kind exchange under section 1031 lets an investor defer gain on the sale of
          investment or business property by acquiring replacement property through a qualified
          intermediary. The intermediary has to be in place <em>before</em> the relinquished
          property closes; once the seller has received or controlled the proceeds, there is no
          exchange left to structure.
        </p>
        <p>
          We can facilitate that exchange through {site.exchangeCompany.name}. It is{' '}
          {site.exchangeCompany.relationship} — the name is shared, the ownership is not, and that
          is worth stating rather than leaving the name to imply otherwise.
        </p>
        <p>
          What the arrangement gets you is coordination rather than two offices working the same
          deadline separately: the exchange documents are ready before the settlement statement is
          cut, the proceeds go where they are supposed to go, and the 45-day identification and
          180-day acquisition clocks are watched by people who are also holding the closing file.
        </p>
        <p>
          You are free to use any qualified intermediary you choose, and nothing about closing here
          requires that one. What we ask is only that you tell us early. We are not tax advisers —
          the decision to exchange, and whether the property qualifies, belongs with your CPA or tax
          counsel.
        </p>

        <h2>Escrow and settlement</h2>
        <p>
          Deposits, payoffs and proceeds are held in our trust account and disbursed on written
          instructions confirmed by voice. We will never send you wire instructions by email and we
          will never email a change to instructions already given. If you receive something that
          appears to come from us with account details in it, call{' '}
          <a href={`tel:${site.phone}`}>{site.phoneDisplay}</a> before acting on it.
        </p>

        <h2>How a signing can happen</h2>
        <ul>
          {site.closingMethods.map((method) => (
            <li key={method}>{method}</li>
          ))}
        </ul>
        <p className="muted ui" style={{ fontSize: '0.875rem' }}>
          Office hours are {officeHoursLine}.
        </p>

        <h2>Working out the cost</h2>
        <p>
          Two ways, neither of which asks you for anything:{' '}
          <Link href="/estimate">estimate from a property address</Link>, which prices the policy
          off the county and the assessed value on the property appraiser&rsquo;s record, or the{' '}
          <Link href="/calculator">calculator</Link>, which works from a price and a loan amount.
          For everything that is not promulgated — our fee, the search, endorsements —{' '}
          <Link href="/quote">ask for an itemised quote</Link>.
        </p>
      </div>

      {docs.length > 0 ? (
        <section style={{ marginTop: '3rem' }}>
          <h2 style={{ marginTop: 0 }}>Service pages</h2>
          <ul className="card-grid">
            {docs.map((doc) => (
              <li key={doc.slug} className="card">
                <h3>
                  <Link href={`/services/${doc.slug}`}>{doc.title}</Link>
                </h3>
                <p>{metaDescription(doc.summary ?? doc.direct_answer, 170)}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="measure">
        <QuietCta />
      </div>
    </div>
  );
}
