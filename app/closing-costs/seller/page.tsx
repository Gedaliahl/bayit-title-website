// What a seller pays at a Florida closing.
//
// The seller's side is mostly the deed — taxed by the state at the county's
// rate — and whatever has to be cleared off the title before it can pass: the
// mortgage, the association's balance, the city's claims. The one figure a
// seller can move is the premium, by producing the prior owner's policy, and
// the page says so with the rule beside it. Everything nobody sets is named
// and left unnumbered.

import type { Metadata } from 'next';
import Link from 'next/link';

import { getCounties } from '@/lib/locations';
import { baseOpenGraph, formatLongDate, metaDescription } from '@/lib/seo';
import { site } from '@/lib/site';
import {
  CHECKED_ON,
  EXAMPLE_PRICE,
  RECORDING_CHARGES,
  deedStampTax,
  deedStampTaxDue,
  discretionarySurtax,
  discretionarySurtaxDue,
  formatMoney,
  recordingChargeDue,
} from '@/lib/statutory-rates';
import {
  CHECKED_ON as PREMIUM_CHECKED_ON,
  PREMIUM_RULE,
  REISSUE_SCHEDULE,
  originalPremium,
  reissuePremium,
} from '@/lib/promulgated-premium';
import type { FaqItem } from '@/lib/faq';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { AnswerPanel, VerifyBanner } from '@/components/Prose';
import { CitedFigures } from '@/components/CitedFigures';
import { Faq } from '@/components/Faq';
import { FaqSchema } from '@/components/Schema';
import { QuietCta } from '@/components/QuietCta';

export const metadata: Metadata = {
  title: 'Seller closing costs in Florida',
  description: metaDescription(
    'Florida seller closing costs: deed stamp tax (70¢ per $100, 60¢ in Miami-Dade), the ' +
      'owner’s policy where custom puts it on the seller, and the payoff.',
  ),
  alternates: { canonical: '/closing-costs/seller' },
  openGraph: { ...baseOpenGraph, url: '/closing-costs/seller' },
};

const STATEWIDE_SLUG = 'broward-county';
const SURTAX_SLUG = 'miami-dade-county';
const SATISFACTION_PAGES = 2;

export default async function SellerClosingCostsPage() {
  const counties = await getCounties();
  const sellerCustom = counties.filter((county) => county.customaryOwnerPolicyPayer === 'seller');
  const buyerCustom = counties.filter((county) => county.customaryOwnerPolicyPayer === 'buyer');

  const statewide = deedStampTax(STATEWIDE_SLUG);
  const miamiDade = deedStampTax(SURTAX_SLUG);
  const surtax = discretionarySurtax(SURTAX_SLUG)!;

  const stampsStatewide = deedStampTaxDue(EXAMPLE_PRICE, STATEWIDE_SLUG);
  const stampsMiamiDade = deedStampTaxDue(EXAMPLE_PRICE, SURTAX_SLUG);
  const surtaxDue = discretionarySurtaxDue(EXAMPLE_PRICE, SURTAX_SLUG);
  const original = originalPremium(EXAMPLE_PRICE);
  const reissue = reissuePremium(EXAMPLE_PRICE);

  const faq: FaqItem[] = [
    {
      question: 'Does the seller pay the documentary stamp tax on the deed in Florida?',
      answer:
        'The statute taxes the deed at 70 cents per $100 of consideration, 60 cents in Miami-Dade, and does not say who pays. The purchase contract allocates it, and the standard Florida contract forms do so in a specific paragraph. Read yours.',
    },
    {
      question: 'Does the seller pay for title insurance in Florida?',
      answer:
        'In some counties custom puts the owner’s policy on the seller and in others on the buyer, and the contract can override custom either way. Where the seller pays, producing the prior owner’s policy can qualify the new one for the reissue rate, which is a lower schedule in the same rule.',
    },
    {
      question: 'What does the seller pay to clear a mortgage?',
      answer:
        'The payoff the lender states in writing as of the closing date, and the recording charge for the satisfaction the lender then records. The payoff is the lender’s figure, not ours; the recording charge is set by statute and charged by the page.',
    },
    {
      question: 'Does the seller pay the real estate commission at closing?',
      answer:
        'Commission is set by the listing agreement between the seller and the brokerage, not by statute and not by the title agency. It appears on the closing statement because it is paid from the proceeds, but its amount is the agreement’s.',
    },
    {
      question: 'Is there withholding on a foreign seller?',
      answer:
        'Federal law can require the buyer to withhold part of the price when the seller is a foreign person, under the IRS rules known as FIRPTA. Whether it applies and how much depends on facts about the seller and the property that only the seller’s tax adviser should settle. We flag it early; we do not give tax advice.',
    },
  ];

  return (
    <div className="frame section">
      <FaqSchema items={faq} />
      <div className="measure">
        <Breadcrumbs
          trail={[
            { name: 'Home', path: '/' },
            { name: 'Seller closing costs', path: '/closing-costs/seller' },
          ]}
        />
        <h1 style={{ marginTop: '1.5rem' }}>Seller closing costs in Florida</h1>

        <AnswerPanel
          text={
            'A Florida seller’s closing costs are the documentary stamp tax on the deed, set by ' +
            'statute at the county’s rate; the owner’s title policy where custom or the contract ' +
            'puts it on the seller; whatever must be paid to deliver clear title — the mortgage ' +
            'payoff, association balances, municipal claims; prorations; and the commission and ' +
            'fees no rule sets. The contract decides which side each line falls on.'
          }
        />

        <VerifyBanner
          flags={[
            `${site.name}’s settlement fee on the seller’s side, which is not promulgated`,
            'How the standard Florida contract forms allocate each line by default',
          ]}
          variant="withheld"
        />

        <h2>Documentary stamp tax on the deed</h2>
        <p>
          The deed is taxed by the state, not by the county, and the Legislature sets the rate. It
          is the same in 66 counties; Miami-Dade is the exception, with a lower deed rate and a
          surtax of its own. The tax is charged on each $100 or part of $100, so it rounds up:
        </p>

        <CitedFigures figures={[statewide, miamiDade, surtax]} />

        <p>
          On a {formatMoney(EXAMPLE_PRICE)} sale that is <strong>{formatMoney(stampsStatewide)}</strong>{' '}
          in 66 counties, and in Miami-Dade <strong>{formatMoney(stampsMiamiDade)}</strong> plus{' '}
          {formatMoney(surtaxDue)} in surtax where what is conveyed is anything other than a
          single-family residence. Which side pays it is decided by the purchase contract, not by
          the statute.
        </p>

        <h2>The owner&rsquo;s title policy, where the seller pays</h2>
        {sellerCustom.length > 0 || buyerCustom.length > 0 ? (
          <p>
            Custom varies by county.{' '}
            {sellerCustom.length > 0
              ? `In ${listNames(sellerCustom.map((county) => county.name))} the seller customarily pays for the owner’s policy. `
              : ''}
            {buyerCustom.length > 0
              ? `In ${listNames(buyerCustom.map((county) => county.name))} it is customarily the buyer. `
              : ''}
            Custom is not law: the contract decides.{' '}
            <Link href="/counties">The county pages</Link> state the custom only where we have
            confirmed it.
          </p>
        ) : (
          <p>
            Custom varies by county, and the contract decides in any event.{' '}
            <Link href="/counties">The county pages</Link> state the custom only where we have
            confirmed it.
          </p>
        )}
        <p>
          Where the seller pays, one thing in the rule moves the figure. If the seller&rsquo;s own
          title was insured and the prior policy can be produced, the new policy can qualify for
          the <strong>reissue rate</strong> in{' '}
          <a href={PREMIUM_RULE.url} rel="nofollow">
            {PREMIUM_RULE.cite}
          </a>
          , which is a different schedule rather than a discount. On a {formatMoney(EXAMPLE_PRICE)}{' '}
          sale the original rate is {formatMoney(original)} and the reissue rate is{' '}
          <strong>{formatMoney(reissue)}</strong>: {formatMoney(original - reissue)} less. Find the
          policy from when you bought and send it with the contract.
        </p>

        <CitedFigures figures={REISSUE_SCHEDULE} />

        <h2>Clearing the title</h2>
        <p>
          A seller delivers title free of what the contract says it must be free of, and the cost
          of getting there is the seller&rsquo;s. None of these is a fee of ours, and none is set by
          rule:
        </p>
        <ul>
          <li>
            <strong>The mortgage payoff</strong> — the lender&rsquo;s written figure as of the
            closing date, paid from proceeds. The lender then records a satisfaction; recording it
            is charged by the page at the statutory rate, {formatMoney(recordingChargeDue(SATISFACTION_PAGES))}{' '}
            for a {SATISFACTION_PAGES}-page satisfaction.
          </li>
          <li>
            <strong>Association balances</strong> — what a condominium or homeowners&rsquo;
            association states is owed on the unit in its estoppel certificate, and the
            association&rsquo;s charge for preparing that certificate.
          </li>
          <li>
            <strong>Municipal claims</strong> — open or expired permits, code enforcement fines and
            utility balances the City knows about and the county&rsquo;s records do not. We order a
            municipal lien search on every file, and what it turns up goes to you in writing.
          </li>
          <li>
            <strong>Judgments and liens against the seller</strong> — paid or released from proceeds
            where they attach to the property.
          </li>
        </ul>

        <CitedFigures figures={RECORDING_CHARGES} />

        <h2>Prorations, commission and the rest</h2>
        <ul>
          <li>
            <strong>Property taxes</strong> — Florida bills the year&rsquo;s taxes after most of the
            year has passed, so a seller closing mid-year usually credits the buyer for the months
            already lived in the house. The contract says how the proration is computed.
          </li>
          <li>
            <strong>Association dues</strong> — prorated as of closing, the same way.
          </li>
          <li>
            <strong>Commission</strong> — set by the listing agreement, paid from proceeds. Not a
            title charge and not ours to set.
          </li>
          <li>
            <strong>The settlement fee</strong> — the title agency&rsquo;s own charge where the
            contract puts one on the seller. Ours is not promulgated and is quoted on the file:{' '}
            <Link href="/quote">request a quote</Link>.
          </li>
          <li>
            <strong>A foreign seller</strong> — federal law can require withholding from the price
            under the IRS rules known as FIRPTA. We raise it at the start of the file; the
            seller&rsquo;s tax adviser settles whether and how much.
          </li>
        </ul>

        <h2>Common questions</h2>
        <Faq items={faq} />

        <p className="muted">
          Premium read from {PREMIUM_RULE.cite} on {formatLongDate(PREMIUM_CHECKED_ON)}. Taxes and
          recording charges read from the statutes on {formatLongDate(CHECKED_ON)} and linked line
          by line above. These pages describe how closing costs generally work in Florida and are not
          legal or tax advice.
        </p>

        <QuietCta
          text="Send us the contract and the payoff lender and we will itemise the seller’s side against the actual documents."
          action="Request a quote"
          href="/quote"
        />
      </div>
    </div>
  );
}

/** "Broward County, Miami-Dade County and Palm Beach County". */
function listNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}
