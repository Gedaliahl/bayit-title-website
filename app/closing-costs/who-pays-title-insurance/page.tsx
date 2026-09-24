// Who pays for the owner's title policy in Florida, county by county.
//
// The answer is local custom, and it differs across the state, which is why
// "who pays title insurance in Florida" is asked so often and answered so
// badly: charts that disagree with each other, and with the surveys they cite.
// This page prints the custom only where the locations table carries it — set
// by the team from its own files, or published by a title underwriter
// (supabase/seed/locations_payer_customs.sql) — and says "not confirmed"
// everywhere else. It is generated from the table, so a county the
// team confirms tomorrow is on this page at the next build, and the county
// pages and this one can never disagree.

import type { Metadata } from 'next';
import Link from 'next/link';

import { getCounties, type Location } from '@/lib/locations';
import { siteOpenGraph, fittedTitle, metaDescription } from '@/lib/seo';
import { site } from '@/lib/site';
import type { FaqItem } from '@/lib/faq';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { AnswerPanel } from '@/components/Prose';
import { Faq } from '@/components/Faq';
import { FaqSchema } from '@/components/Schema';
import { QuietCta } from '@/components/QuietCta';

const PATH = '/closing-costs/who-pays-title-insurance';

export const metadata: Metadata = {
  title: fittedTitle('Who pays for title insurance in Florida, by county'),
  description: metaDescription(
    'Who customarily pays for the owner’s title policy in each Florida county — buyer or seller — ' +
      'where the custom has been confirmed, and why the contract decides it.',
  ),
  alternates: { canonical: PATH },
  openGraph: { ...siteOpenGraph, url: PATH },
};

/** "Broward, Collier and Sarasota", without the word County on each. */
function listNames(counties: Pick<Location, 'name'>[]): string {
  const names = counties.map((county) => county.name.replace(/ County$/, ''));
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

function customLabel(county: Location): string {
  if (county.customaryOwnerPolicyPayer === 'buyer') return 'Buyer';
  if (county.customaryOwnerPolicyPayer === 'seller') return 'Seller';
  if (county.customaryOwnerPolicyDetail) return 'Varies within the county';
  return 'Not confirmed';
}

export default async function WhoPaysTitleInsurancePage() {
  const counties = [...(await getCounties())].sort((a, b) => a.name.localeCompare(b.name));
  const buyer = counties.filter((county) => county.customaryOwnerPolicyPayer === 'buyer');
  const seller = counties.filter((county) => county.customaryOwnerPolicyPayer === 'seller');
  const varies = counties.filter(
    (county) => !county.customaryOwnerPolicyPayer && county.customaryOwnerPolicyDetail,
  );
  const unconfirmed = counties.length - buyer.length - seller.length - varies.length;

  // The priority counties whose custom is confirmed, in the order lib/site.ts
  // ranks them: the ones a reader of this page is most likely to be asking about.
  const priority = site.priorityCounties
    .map((name) => counties.find((county) => county.name === name))
    .filter((county): county is Location => Boolean(county?.customaryOwnerPolicyPayer));
  const prioritySeller = priority.filter((county) => county.customaryOwnerPolicyPayer === 'seller');

  const faq: FaqItem[] = [
    ...priority.map((county) => ({
      question: `Who pays for title insurance in ${county.name}?`,
      answer:
        `By local custom, the ${county.customaryOwnerPolicyPayer} pays for the owner’s policy in ` +
        `${county.name}. Custom is not law: the purchase contract decides it, and in a negotiated ` +
        'deal either side can end up paying.',
    })),
    {
      question: 'Can the contract put the owner’s policy on the other side?',
      answer:
        'Yes. Custom is only the starting point. The purchase contract decides who pays, and in a ' +
        'negotiated deal either side can end up paying. Read the contract before assuming which line ' +
        'it falls on.',
    },
    {
      question: 'Who pays for the lender’s title policy?',
      answer:
        'The lender’s policy protects the lender and is ordinarily on the borrower’s side of the ' +
        'statement. A cash purchase has no lender’s policy.',
    },
    {
      question: 'Is the premium different depending on who pays?',
      answer:
        'No. The premium is promulgated statewide by the Office of Insurance Regulation, so the ' +
        'figure is the same whichever side of the statement it lands on. Custom decides the side, ' +
        'not the price.',
    },
  ];

  return (
    <div className="frame section">
      <FaqSchema items={faq} />
      <div className="measure">
        <Breadcrumbs
          trail={[
            { name: 'Home', path: '/' },
            { name: 'Closing costs', path: '/closing-costs' },
            { name: 'Who pays for title insurance', path: PATH },
          ]}
        />
        <h1 className="after-crumbs">Who pays for title insurance in Florida?</h1>

        <AnswerPanel
          text={
            'It depends on the county, and the purchase contract decides it in every case. ' +
            // Only what the table confirms. A build without the county data
            // has none, and says so rather than "the buyer pays in 0 counties".
            (buyer.length > 0 && seller.length > 0
              ? `By local custom the buyer pays for the owner’s policy in ${buyer.length} counties — ` +
                `${listNames(buyer)} — and the seller in ${seller.length}` +
                (prioritySeller.length > 0 ? `, ${listNames(prioritySeller)} among them` : '') +
                '. '
              : 'Which side the custom puts it on differs across the state. ') +
            'The lender’s policy is ordinarily on the borrower’s side. The premium is the same ' +
            'either way: it is promulgated statewide.'
          }
        />

        <h2>County by county</h2>
        <p>
          The custom is printed where it has been confirmed: by our own team from its files, or by
          a title underwriter&rsquo;s published survey of its members. Where neither has confirmed
          it we say so rather than repeat a chart, because the published charts disagree with each
          other.
        </p>

        <div className="table-scroll" role="region" tabIndex={0} aria-label="Who pays for the owner’s policy, by county">
          <table className="figure-table">
            <caption>Who customarily pays for the owner&rsquo;s title policy, by Florida county</caption>
            <thead>
              <tr>
                <th scope="col">County</th>
                <th scope="col">Owner&rsquo;s policy customarily paid by</th>
              </tr>
            </thead>
            <tbody>
              {counties.map((county) => (
                <tr key={county.slug}>
                  <th scope="row">
                    <Link href={`/counties/${county.slug}`}>{county.name}</Link>
                  </th>
                  <td>{customLabel(county)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="muted">
          {buyer.length} buyer, {seller.length} seller
          {varies.length > 0 ? `, ${varies.length} varying within the county` : ''}, and {unconfirmed}{' '}
          not yet confirmed. On a file in any of them, ask us and we will tell you what we are seeing.
        </p>

        <h2>Custom is not law</h2>
        <p>
          Custom is the starting point, not a rule. The purchase contract decides who pays for the
          owner&rsquo;s policy, and in a negotiated deal either side can end up paying, so read the
          contract before assuming which line it falls on.
        </p>

        <h2>What the owner&rsquo;s policy costs</h2>
        <p>
          The same in every county. The premium comes off the schedule the Office of Insurance
          Regulation promulgates by rule, and the{' '}
          <Link href="/closing-costs/title-insurance-calculator">
            Florida title insurance calculator
          </Link>{' '}
          works it out for a specific price, with the lender&rsquo;s policy beside it. What each
          side pays at the closing, line by line, is on the{' '}
          <Link href="/closing-costs/buyer">buyer</Link> and{' '}
          <Link href="/closing-costs/seller">seller</Link> closing cost pages.
        </p>

        <h2>Common questions</h2>
        <Faq items={faq} />

        <QuietCta
          text="Tell us the county and the contract date and we will tell you who the contract puts the owner’s policy on, and what it costs."
          action="Request a quote"
          href="/quote"
        />
      </div>
    </div>
  );
}
