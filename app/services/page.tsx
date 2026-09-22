// What the agency does, arranged so a reader can see the whole shape of it
// before reading any of it: four things in the card, five steps in the band,
// then the detail beside a rail.

import type { Metadata } from 'next';
import Link from 'next/link';

import { getAllDocs } from '@/lib/content';
import { metaDescription } from '@/lib/seo';
import { officeHoursLine, site } from '@/lib/site';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { QuietCta } from '@/components/QuietCta';
import { Verdict } from '@/components/Verdict';
import { StepBand } from '@/components/StepBand';
import { Rail } from '@/components/Rail';

export const metadata: Metadata = {
  title: 'Services',
  description:
    'Title search and examination, title insurance, settlement and escrow, commercial title, and ' +
    '1031 exchanges facilitated through Bayit Exchange Company — with closings held in our ' +
    'office, wherever the signer is, or online, throughout Florida.',
  alternates: { canonical: '/services' },
};

/** The RON card links here when the page exists, and says nothing when it does not. */
const RON_SLUG = 'mobile-and-remote-signings';

const FILE_STEPS = [
  {
    label: 'Step 1',
    title: 'The file opens',
    body: 'Contract in, search ordered the same day, one processor and one closer assigned.',
  },
  {
    label: 'Step 2',
    title: 'Search read, issues raised',
    body: 'Anything that could hold up closing goes to you in writing with what it takes to clear.',
  },
  {
    label: 'Step 3',
    title: 'Commitment issued',
    body: 'Requirements and exceptions listed; payoffs and estoppels ordered.',
  },
  {
    label: 'Step 4',
    title: 'Signing',
    body: 'In our office, wherever the signer is, or by remote online notarization.',
  },
  {
    label: 'Step 5',
    title: 'Record, disburse, insure',
    body: 'Documents recorded, funds out on verified instructions, policy issued.',
  },
];

const COMMERCIAL = [
  {
    title: 'Entity work',
    body:
      'Corporate, partnership and LLC searches, good standing, authority documents, and the ' +
      'resolutions the underwriter will want before it insures a signature.',
  },
  {
    title: 'The right policy and endorsements',
    body:
      'ALTA owner’s and loan policies, leasehold coverage, and the endorsement set a commercial ' +
      'lender asks for, quoted line by line.',
  },
  {
    title: 'Searches against the parties',
    body:
      'UCC, judgment and lien searches against the entities and principals on both sides, plus ' +
      'tax, assessment and permit questions.',
  },
  {
    title: 'Escrow on the negotiated terms',
    body:
      'Holdbacks, staged disbursement, multiple lenders, assignment of leases and rents — held ' +
      'to what the parties actually agreed.',
  },
];

const COST_ROUTES = [
  {
    eyebrow: 'From an address',
    title: 'Estimate from a property address',
    body: 'Prices the policy off the county and the assessed value on the appraiser’s record.',
    href: '/estimate',
  },
  {
    eyebrow: 'From a price',
    title: 'Premium calculator',
    body: 'Works from a price and a loan amount; adds doc stamps, intangible tax and recording.',
    href: '/estimate?mode=numbers',
  },
  {
    eyebrow: 'Everything else',
    title: 'Ask for an itemised quote',
    body: 'Our fee, the search, endorsements — everything that is not promulgated, line by line.',
    href: '/quote',
  },
];

export default async function ServicesIndex() {
  const docs = await getAllDocs('services');
  const ron = docs.find((doc) => doc.slug === RON_SLUG);
  // Anything the page does not already link to from the signing cards.
  const otherDocs = docs.filter((doc) => doc.slug !== ron?.slug);

  const railItems = [
    { id: 'residential', label: 'Residential closings' },
    { id: 'commercial', label: 'Commercial title' },
    { id: 'exchange', label: '1031 exchanges' },
    { id: 'escrow', label: 'Escrow and settlement' },
    { id: 'signing', label: 'How a signing can happen' },
    { id: 'cost', label: 'Working out the cost' },
    ...(otherDocs.length > 0 ? [{ id: 'pages', label: 'Service pages' }] : []),
  ];

  return (
    <div>
      <section className="frame page-hero">
        <div className="page-hero__copy">
          <Breadcrumbs
            trail={[
              { name: 'Home', path: '/' },
              { name: 'Services', path: '/services' },
            ]}
          />
          <h1>What we do</h1>
          <p className="page-hero__lede">
            We search title, examine what the search returns, issue commitments and policies as an
            agent for {site.underwriter}, hold the escrow, and run the closing. Every file is worked
            by the same four people, in {site.address.city} — read by a person, raised early, and in
            writing.
          </p>
          <p className="page-hero__meta">
            <span>
              <span className="page-hero__dot" aria-hidden="true" />
              Residential and commercial, throughout {site.serviceArea}
            </span>
            <span>Underwritten by {site.underwriter}</span>
          </p>
        </div>

        <Verdict
          eyebrow="What a title agency does"
          headline="Four things, one team."
          rows={[
            { term: 'Search & examine', detail: 'Read by a person, day one' },
            { term: 'Insure', detail: `Commitments and policies on ${site.underwriter} paper` },
            { term: 'Hold escrow', detail: 'Trust account; instructions confirmed by voice' },
            { term: 'Close', detail: 'In office, mobile, or remote online' },
          ]}
          action={{ prompt: 'Have a contract?', label: 'Open an order', href: '/order' }}
        />
      </section>

      <StepBand
        heading="How a file moves"
        caption="Five steps from contract to policy"
        columns={5}
        steps={FILE_STEPS}
      />

      <div className="frame cols">
        <Rail label="The detail" items={railItems} />

        <div className="detail">
          <section id="residential">
            <h2>Residential closings</h2>
            <div className="prose prose--detail">
              <p>
                Purchases, sales, refinances, new construction, condominium and HOA files, cash
                closings, out-of-state and foreign sellers. The search is ordered the day the file
                opens, read by a person, and anything that could hold up the closing goes to you in
                writing with what it would take to clear — not saved for the table.
              </p>
            </div>
          </section>

          <section id="commercial">
            <h2>Commercial title</h2>
            <div className="prose prose--detail">
              <p>
                Office, retail, industrial, multifamily and vacant land, for purchases, sales and
                financings. A commercial file is not a residential file with a larger number on it,
                and the extra work is the point of hiring someone who does it regularly:
              </p>
            </div>
            <ul className="card-grid card-grid--narrow">
              {COMMERCIAL.map((item) => (
                <li key={item.title} className="flat-card">
                  <p className="flat-card__title">{item.title}</p>
                  <p className="flat-card__body">{item.body}</p>
                </li>
              ))}
            </ul>
            <div className="prose prose--detail">
              <p>
                Send us the contract and the entity names early. Authority documents and estoppels
                are the two things that most often decide whether a commercial closing holds its
                date.
              </p>
            </div>
          </section>

          <section id="exchange">
            <h2>1031 exchanges, through {site.exchangeCompany.name}</h2>
            <div className="prose prose--detail">
              <p>
                A like-kind exchange under section 1031 lets an investor defer gain on the sale of
                investment or business property by acquiring replacement property through a
                qualified intermediary. The intermediary has to be in place <em>before</em> the
                relinquished property closes; once the seller has received or controlled the
                proceeds, there is no exchange left to structure.
              </p>
              <p>
                We can facilitate that exchange through {site.exchangeCompany.name}. It is{' '}
                {site.exchangeCompany.relationship} — the name is shared, the ownership is not, and
                that is worth stating rather than leaving the name to imply otherwise.
              </p>
              <p>
                What the arrangement gets you is coordination rather than two offices working the
                same deadline separately: the exchange documents are ready before the settlement
                statement is cut, the proceeds go where they are supposed to go, and the 45-day
                identification and 180-day acquisition clocks are watched by people who are also
                holding the closing file.
              </p>
              <p>
                You are free to use any qualified intermediary you choose, and nothing about closing
                here requires that one. What we ask is only that you tell us early. We are not tax
                advisers — the decision to exchange, and whether the property qualifies, belongs
                with your CPA or tax counsel.
              </p>
            </div>
          </section>

          <section id="escrow">
            <h2>Escrow and settlement</h2>
            <div className="prose prose--detail">
              <p>
                Deposits, payoffs and proceeds are held in our trust account and disbursed on
                written instructions confirmed by voice.
              </p>
            </div>
            <div className="callout">
              <p className="callout__eyebrow">Wire safety</p>
              <div className="prose prose--detail">
                <p>
                  We will never send you wire instructions by email and we will never email a change
                  to instructions already given. If you receive something that appears to come from
                  us with account details in it, call{' '}
                  <a href={`tel:${site.phone}`}>{site.phoneDisplay}</a> before acting on it.
                </p>
              </div>
            </div>
          </section>

          <section id="signing">
            <div className="section__head">
              <h2>How a signing can happen</h2>
              <span className="caption">Office hours {officeHoursLine}</span>
            </div>
            <ul className="card-grid card-grid--narrow">
              <li className="flat-card">
                <p className="flat-card__title">In-office signing</p>
                <p className="flat-card__body">
                  {site.address.street}, {site.address.city}.
                </p>
              </li>
              <li className="flat-card">
                <p className="flat-card__title">Mobile signing</p>
                <p className="flat-card__body">
                  A closer comes to the signer. Arranged file by file, including outside office
                  hours.
                </p>
              </li>
              <li className="flat-card">
                <p className="flat-card__title">Remote online notarization</p>
                <p className="flat-card__body">
                  Signed online with a Florida-commissioned online notary.{' '}
                  {ron ? <Link href={`/services/${ron.slug}`}>How it works →</Link> : null}
                </p>
              </li>
            </ul>
          </section>

          <section id="cost">
            <h2>Working out the cost</h2>
            <div className="prose prose--detail">
              <p>
                Three ways, none of which asks you for anything. The premium is promulgated — set by
                the Florida Office of Insurance Regulation — so there is nothing to trade for it.
              </p>
            </div>
            <ul className="card-grid card-grid--narrow">
              {COST_ROUTES.map((route) => (
                <li key={route.href}>
                  <Link href={route.href} className="card-link card-link--tight">
                    <span className="card-link__eyebrow">{route.eyebrow}</span>
                    <span className="card-link__title card-link__title--small">{route.title}</span>
                    <span className="card-link__body card-link__body--small">{route.body}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {otherDocs.length > 0 ? (
            <section id="pages">
              <h2>Service pages</h2>
              <ul className="card-grid card-grid--narrow">
                {otherDocs.map((doc) => (
                  <li key={doc.slug}>
                    <Link href={`/services/${doc.slug}`} className="card-link card-link--tight">
                      <span className="card-link__title card-link__title--small">{doc.title}</span>
                      <span className="card-link__body card-link__body--small">
                        {metaDescription(doc.summary ?? doc.direct_answer, 150)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>

      <QuietCta
        variant="band"
        text="Send us the contract and we will open the file today."
      />
    </div>
  );
}
