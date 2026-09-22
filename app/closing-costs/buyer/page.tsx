// What a buyer pays at a Florida closing.
//
// Three kinds of line sit on a buyer's side of the statement, and the page
// keeps them apart because they are checkable to different degrees: figures
// the statute sets (taxes and recording, cited to the section), figures the
// OIR rule sets (the premium, cited to the rule), and figures nobody sets
// (fees, prorations, the lender's charges), which this page names and refuses
// to number. Who pays which is the contract's decision, and where custom is
// stated it is read off the locations table, not typed in.

import type { Metadata } from 'next';
import Link from 'next/link';

import { getCounties } from '@/lib/locations';
import { formatLongDate } from '@/lib/seo';
import { site } from '@/lib/site';
import {
  CHECKED_ON,
  EXAMPLE_LOAN,
  EXAMPLE_PRICE,
  MORTGAGE_CHARGES,
  RECORDING_CHARGES,
  formatMoney,
  intangibleTaxDue,
  mortgageStampTaxDue,
  recordingChargeDue,
} from '@/lib/statutory-rates';
import { LENDER_POLICY_BESIDE_RULE } from '@/lib/agency-charges';
import {
  CHECKED_ON as PREMIUM_CHECKED_ON,
  ORIGINAL_SCHEDULE,
  PREMIUM_RULE,
  SIMULTANEOUS_LOAN_PREMIUM,
  originalPremium,
  simultaneousLoanPremium,
} from '@/lib/promulgated-premium';
import type { FaqItem } from '@/lib/faq';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { AnswerPanel, VerifyBanner } from '@/components/Prose';
import { CitedFigures } from '@/components/CitedFigures';
import { Faq } from '@/components/Faq';
import { FaqSchema } from '@/components/Schema';
import { QuietCta } from '@/components/QuietCta';

export const metadata: Metadata = {
  title: 'Buyer closing costs in Florida',
  description:
    'What a buyer pays at a Florida closing: the mortgage stamp tax, intangible tax and recording ' +
    'charges the statute sets, the promulgated title insurance premium, and the fees no rule sets. ' +
    'Each figure cited to the statute or rule, with a worked example.',
  alternates: { canonical: '/closing-costs/buyer' },
};

const MORTGAGE_PAGES = 12;

export default async function BuyerClosingCostsPage() {
  const counties = await getCounties();
  const buyerCustom = counties.filter((county) => county.customaryOwnerPolicyPayer === 'buyer');
  const sellerCustom = counties.filter((county) => county.customaryOwnerPolicyPayer === 'seller');

  const ownerPremium = originalPremium(EXAMPLE_PRICE);
  const loanPremium = simultaneousLoanPremium(EXAMPLE_LOAN, EXAMPLE_PRICE);
  const mortgageStamps = mortgageStampTaxDue(EXAMPLE_LOAN);
  const intangible = intangibleTaxDue(EXAMPLE_LOAN);
  const recording = recordingChargeDue(MORTGAGE_PAGES);
  const statutoryTotal = mortgageStamps + intangible + recording;

  const faq: FaqItem[] = [
    {
      question: 'Does the buyer pay for title insurance in Florida?',
      answer:
        'It depends on the county and, above all, on the contract. Who pays for the owner’s policy is local custom, and the purchase contract can put it on either side. The lender’s policy protects the lender and is ordinarily on the borrower’s side of the statement.',
    },
    {
      question: 'Are buyer closing costs the same in every Florida county?',
      answer:
        'The title premium is promulgated statewide and the mortgage taxes and recording charges are set by statute, so those are the same everywhere. What changes by county is custom — who pays for the owner’s policy — and, in Miami-Dade only, the deed stamp rate and surtax, which fall on whichever side the contract says.',
    },
    {
      question: 'Can a buyer shop for a lower title insurance premium?',
      answer:
        'Not in Florida. The premium comes off a schedule the Office of Insurance Regulation promulgates by rule, so it is the same figure at every agency for the same coverage. What differs between agencies is the settlement fee, the search and the work.',
    },
    {
      question: 'What does a cash buyer not pay?',
      answer:
        'A cash buyer has no mortgage, so there is no documentary stamp tax on a mortgage, no intangible tax, no lender’s policy and no mortgage to record. The owner’s policy, the deed stamps and the recording of the deed still fall where the contract puts them.',
    },
    {
      question: 'Does the buyer pay the documentary stamp tax on the deed?',
      answer:
        'The statute taxes the deed; it does not say who pays. The purchase contract allocates it, and the standard Florida contract forms do so in a specific paragraph. Read yours rather than assuming.',
    },
  ];

  return (
    <div className="frame section">
      <FaqSchema items={faq} />
      <div className="measure">
        <Breadcrumbs
          trail={[
            { name: 'Home', path: '/' },
            { name: 'Buyer closing costs', path: '/closing-costs/buyer' },
          ]}
        />
        <h1 style={{ marginTop: '1.5rem' }}>Buyer closing costs in Florida</h1>

        <AnswerPanel
          text={
            'A Florida buyer’s closing costs come in three kinds. The statute sets the taxes and ' +
            'recording on the mortgage. The Office of Insurance Regulation sets the title premium. ' +
            'Nothing sets the rest — the lender’s charges, the settlement fee, survey, appraisal, ' +
            'association fees and prorations. Which side pays each line is decided by the purchase ' +
            'contract, with local custom as the starting point.'
          }
        />

        <VerifyBanner
          flags={[
            `${site.name}’s settlement fee and search fee on the buyer’s side, which are not promulgated`,
            'How the standard Florida contract forms allocate each line by default',
          ]}
          variant="withheld"
        />

        <h2>What the statute sets, on a financed purchase</h2>
        <p>
          Three charges attach to the mortgage rather than to the sale, so a buyer paying cash has
          none of them. Each is set by the Legislature and is the same in all 67 counties:
        </p>

        <CitedFigures figures={MORTGAGE_CHARGES} />

        <p>
          Recording the mortgage is charged by the page, at a rate every clerk in Florida applies:
        </p>

        <CitedFigures figures={RECORDING_CHARGES} />

        <p>
          On a {formatMoney(EXAMPLE_LOAN)} loan that is <strong>{formatMoney(mortgageStamps)}</strong>{' '}
          in mortgage stamps, <strong>{formatMoney(intangible)}</strong> in intangible tax, and{' '}
          <strong>{formatMoney(recording)}</strong> to record a {MORTGAGE_PAGES}-page mortgage:{' '}
          {formatMoney(statutoryTotal)} before anyone&rsquo;s fee.
        </p>

        <h2>The title insurance premium</h2>
        <p>
          The premium is not a {site.name} price. It comes off the schedule in{' '}
          <a href={PREMIUM_RULE.url} rel="nofollow">
            {PREMIUM_RULE.cite}
          </a>
          , promulgated under{' '}
          <a href={PREMIUM_RULE.authorityUrl} rel="nofollow">
            {PREMIUM_RULE.authorityCite}
          </a>
          , and is the same figure at every agency in the state for the same coverage. Per $1,000 of
          liability:
        </p>

        <CitedFigures figures={ORIGINAL_SCHEDULE} />

        <p>
          An owner&rsquo;s policy on a {formatMoney(EXAMPLE_PRICE)} purchase is{' '}
          <strong>{formatMoney(ownerPremium)}</strong>. A lender&rsquo;s policy issued at the same
          time on the same land is <strong>{formatMoney(SIMULTANEOUS_LOAN_PREMIUM)}</strong> for
          coverage up to the owner&rsquo;s amount — {formatMoney(loanPremium)} on a{' '}
          {formatMoney(EXAMPLE_LOAN)} loan. {LENDER_POLICY_BESIDE_RULE}{' '}
          <Link href="/estimate?mode=numbers">The estimate page</Link> works both out for any price
          and loan.
        </p>

        <h3>Who pays for the owner&rsquo;s policy</h3>
        {buyerCustom.length > 0 || sellerCustom.length > 0 ? (
          <p>
            Custom varies by county.{' '}
            {buyerCustom.length > 0
              ? `In ${listNames(buyerCustom.map((county) => county.name))} the buyer customarily pays for the owner’s policy. `
              : ''}
            {sellerCustom.length > 0
              ? `In ${listNames(sellerCustom.map((county) => county.name))} it is customarily the seller. `
              : ''}
            Custom is not law: the contract decides, and either side can end up paying. The county
            pages state the custom only where we have confirmed it —{' '}
            <Link href="/counties">the county pages</Link> say which.
          </p>
        ) : (
          <p>
            Custom varies by county, and the contract decides in any event.{' '}
            <Link href="/counties">The county pages</Link> state the custom only where we have
            confirmed it.
          </p>
        )}
        <p>
          The lender&rsquo;s policy is a condition of the loan, protects the lender, and is
          ordinarily on the borrower&rsquo;s side of the statement.
        </p>

        <h2>What nothing sets</h2>
        <p>
          The rest of the buyer&rsquo;s side is priced by whoever provides it, and this page gives no
          figure for any of it because no rule does:
        </p>
        <ul>
          <li>
            <strong>The lender&rsquo;s charges</strong> — origination, underwriting, points,
            appraisal, credit report, flood certification, prepaid interest, and the initial deposit
            into the escrow account for taxes and insurance. They are on the lender&rsquo;s Loan
            Estimate, not ours.
          </li>
          <li>
            <strong>The settlement fee and the title search</strong> — the title agency&rsquo;s own
            charges. Ours are not promulgated and are quoted on the file:{' '}
            <Link href="/quote">request a quote</Link>.
          </li>
          <li>
            <strong>Survey and inspections</strong> — ordered by the buyer, priced by the surveyor and
            the inspector.
          </li>
          <li>
            <strong>Association charges</strong> — an application or transfer fee to a condominium or
            homeowners&rsquo; association, and the first assessment, where the property is in one.
          </li>
          <li>
            <strong>Prorations</strong> — property taxes and association dues divided between the
            parties as of the closing date, as the contract provides. A credit, not a fee.
          </li>
          <li>
            <strong>Homeowner&rsquo;s insurance</strong> — the first year&rsquo;s premium, where a
            lender requires it paid at closing.
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
          text="Send us the price, the loan amount and the county and we will itemise the buyer’s side against the actual documents."
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
