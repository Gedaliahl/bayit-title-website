// The Florida title insurance calculator: the page that answers "what does
// title insurance cost in Florida" with the rule's own arithmetic.
//
// The premium is promulgated, so this is the one closing cost that can be
// published exactly, and it is the one most often searched for. The county
// pages used to print the whole schedule sixty-seven times over; it lives here
// now, once, with the calculator in front of it and the county pages linking
// in. Nothing on the page is a new figure: the calculator is the estimate
// page's own (lib/closing-estimate.ts), and every table cell is computed from
// lib/promulgated-premium.ts, which cites the rule.

import type { Metadata } from 'next';
import Link from 'next/link';

import { getCounties } from '@/lib/locations';
import { siteOpenGraph, formatLongDate, metaDescription } from '@/lib/seo';
import {
  CHECKED_ON as PREMIUM_CHECKED_ON,
  MINIMUM_PREMIUM,
  NEW_HOME_MINIMUM_PREMIUM,
  ORIGINAL_SCHEDULE,
  PREMIUM_RULE,
  REISSUE_SCHEDULE,
  SIMULTANEOUS_LOAN_PREMIUM,
  originalPremium,
  reissuePremium,
} from '@/lib/promulgated-premium';
import { LENDER_POLICY_BESIDE_RULE } from '@/lib/agency-charges';
import { REISSUE_CONDITIONS, UNPRICED } from '@/lib/closing-estimate';
import { EXAMPLE_PRICE, formatMoney } from '@/lib/statutory-rates';
import type { FaqItem } from '@/lib/faq';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { AnswerPanel } from '@/components/Prose';
import { CitedFigures } from '@/components/CitedFigures';
import { Faq } from '@/components/Faq';
import { FaqSchema } from '@/components/Schema';
import { FigureTable } from '@/components/FigureTable';
import { QuietCta } from '@/components/QuietCta';
import { EstimateModeProvider } from '@/components/estimate/EstimateMode';
import { CalculatorPane } from '@/components/estimate/CalculatorPane';

const PATH = '/closing-costs/title-insurance-calculator';

export const metadata: Metadata = {
  title: 'Florida title insurance calculator',
  description: metaDescription(
    'Florida title insurance premiums are set by rule, so they can be worked out exactly: the ' +
      'owner’s policy, the reissue rate and the lender’s policy, each cited to the rule.',
  ),
  alternates: { canonical: PATH },
  openGraph: { ...siteOpenGraph, url: PATH },
};

/** The prices a reader is most likely to be looking for, from starter home to estate. */
const TABLE_PRICES = [
  100_000, 150_000, 200_000, 250_000, 300_000, 350_000, 400_000, 450_000, 500_000, 600_000,
  700_000, 750_000, 800_000, 900_000, 1_000_000, 1_250_000, 1_500_000, 2_000_000, 3_000_000,
];

export default async function TitleInsuranceCalculatorPage() {
  const counties = await getCounties();
  const selectable = counties.map((county) => ({
    slug: county.slug,
    name: county.name,
    propertyAppraiserUrl: county.propertyAppraiserUrl,
    customaryOwnerPolicyPayer: county.customaryOwnerPolicyPayer,
  }));

  const example = originalPremium(EXAMPLE_PRICE);
  const exampleReissue = reissuePremium(EXAMPLE_PRICE);
  const [firstBracket, secondBracket] = ORIGINAL_SCHEDULE;

  const faq: FaqItem[] = [
    {
      question: 'How much is title insurance in Florida?',
      answer:
        `On a ${formatMoney(EXAMPLE_PRICE)} purchase the owner’s policy is ${formatMoney(example)} ` +
        `at the original rate, or ${formatMoney(exampleReissue)} where the reissue conditions are ` +
        `met. The rate runs per $1,000 of coverage: ${firstBracket.amount} on the ` +
        `${firstBracket.label.toLowerCase()}, then ${secondBracket.amount} from ` +
        `${secondBracket.label.replace(/ to .*/, '')} up to ${secondBracket.label.replace(/.* to /, '')}, ` +
        `with a minimum premium of ${formatMoney(MINIMUM_PREMIUM)}.`,
    },
    {
      question: 'Can a buyer shop for a lower title insurance premium?',
      answer:
        'Not in Florida. The premium comes off a schedule the Office of Insurance Regulation ' +
        'promulgates by rule, so it is the same figure at every agency for the same coverage. What ' +
        'differs between agencies is the settlement fee, the search and the work.',
    },
    {
      question: 'What is the reissue rate on Florida title insurance?',
      answer:
        'A different schedule in the same rule, for a policy on property whose owner or seller was ' +
        'already insured and whose policy both the agent and the underwriter keep. The common case is ' +
        `a new policy dated less than three years after the old one. On a ${formatMoney(EXAMPLE_PRICE)} ` +
        `purchase it is ${formatMoney(exampleReissue)} rather than ${formatMoney(example)}.`,
    },
    {
      question: 'What does the lender’s policy cost when it is issued with the owner’s policy?',
      answer:
        `The rule sets ${formatMoney(SIMULTANEOUS_LOAN_PREMIUM)} as the least a lender’s policy ` +
        'issued at the same time on the same land can be, for coverage up to the owner’s amount. ' +
        LENDER_POLICY_BESIDE_RULE,
    },
    {
      question: 'Who pays for title insurance in Florida?',
      answer:
        'Who pays for the owner’s policy is local custom, and it differs by county; the purchase ' +
        'contract can put it on either side. The lender’s policy protects the lender and is ' +
        'ordinarily on the borrower’s side of the statement.',
    },
  ];

  return (
    <>
      <FaqSchema items={faq} />
      <div className="frame section">
        <div className="measure">
          <Breadcrumbs
            trail={[
              { name: 'Home', path: '/' },
              { name: 'Closing costs', path: '/closing-costs' },
              { name: 'Title insurance calculator', path: PATH },
            ]}
          />
          <h1 className="after-crumbs">Florida title insurance calculator</h1>

          <AnswerPanel
            text={
              'Florida title insurance premiums are promulgated: the Office of Insurance Regulation ' +
              `sets them by rule, ${PREMIUM_RULE.cite}, so the premium can be worked out exactly. ` +
              `On a ${formatMoney(EXAMPLE_PRICE)} purchase the owner’s policy is ` +
              `${formatMoney(example)}, or ${formatMoney(exampleReissue)} at the reissue rate where ` +
              'the rule’s conditions are met. Enter a price and a loan below for the owner’s and ' +
              'lender’s policies, with the transfer taxes and recording for the same closing.'
            }
          />
        </div>
      </div>

      <EstimateModeProvider>
        <section className="band estimator" aria-labelledby="calculator-heading">
          <div className="frame band__inner">
            <div className="band__head">
              <h2 id="calculator-heading">Work out the premium</h2>
              <span className="band__caption">
                The premium is the rule&rsquo;s, not ours — there is nothing to trade for it
              </span>
            </div>
            <CalculatorPane mode="numbers" hidden={false} counties={selectable} valueCountySlugs={[]} />
          </div>
        </section>
      </EstimateModeProvider>

      <div className="frame section">
        <div className="measure">
          <h2 className="flush-top">The owner&rsquo;s premium at common prices</h2>
          <p>
            An owner&rsquo;s policy is written for the full purchase price. Worked from{' '}
            <a href={PREMIUM_RULE.url} rel="nofollow">
              {PREMIUM_RULE.cite}
            </a>
            ; the reissue column assumes the previous policy insured at least the new amount, and
            the calculator above splits it where it did not.
          </p>

          <FigureTable
            caption="Florida owner’s title insurance premium, by purchase price"
            columns={['Purchase price', 'Original rate', 'Reissue rate']}
            rows={TABLE_PRICES.map((price) => [
              formatMoney(price),
              formatMoney(originalPremium(price)),
              formatMoney(reissuePremium(price)),
            ])}
          />

          <h2>How the premium is worked out</h2>
          <p>
            The rate runs per $1,000 of liability, in bands, so each band of the price is charged at
            its own rate and the bands are added together. Before any of that, a fraction of $100
            counts as a full $100, and the minimum premium on a conveyance is{' '}
            {formatMoney(MINIMUM_PREMIUM)}.
          </p>

          <CitedFigures figures={ORIGINAL_SCHEDULE} />

          <p>
            The schedule is the rule&rsquo;s, not ours, which is why it is printed here rather than
            kept behind a form: you can open the rule and arrive at the same number. The Office of
            Insurance Regulation sets it under{' '}
            <a href={PREMIUM_RULE.authorityUrl} rel="nofollow">
              {PREMIUM_RULE.authorityCite}
            </a>
            .
          </p>

          <section id="reissue">
            <h2>When does the reissue rate apply?</h2>
            <p>
              The reissue rate is a different schedule in the same rule, not a discount on the
              first one. It applies where:
            </p>
            <ol>
              {REISSUE_CONDITIONS.map((condition) => (
                <li key={condition}>{condition}</li>
              ))}
            </ol>
            <CitedFigures figures={REISSUE_SCHEDULE} />
            <p>
              It reaches only as far as the old policy did. Under{' '}
              <a href={PREMIUM_RULE.url} rel="nofollow">
                R. 69O-186.003(2)(c)
              </a>{' '}
              anything above what the previous policy insured is charged at the original schedule,
              which is most of the difference on a property worth more now than when it was last
              insured.
            </p>
          </section>

          <h2>The lender&rsquo;s policy, issued with the owner&rsquo;s</h2>
          <p>
            Where a lender&rsquo;s policy is issued at the same time as the owner&rsquo;s policy on the
            same land, the rule sets {formatMoney(SIMULTANEOUS_LOAN_PREMIUM)} as the least it can be
            for coverage up to the owner&rsquo;s amount. {LENDER_POLICY_BESIDE_RULE}
          </p>

          <h2>The new home purchase discount</h2>
          <p>
            On the first sale of a newly built one- to four-family home the seller has neither leased
            nor occupied, the premium is reduced by what was paid for the builder&rsquo;s loan policy,
            with a floor of {formatMoney(NEW_HOME_MINIMUM_PREMIUM)}. It cannot be combined with the
            reissue rate.
          </p>

          <h2>Who pays for the owner&rsquo;s policy?</h2>
          <p>
            That is local custom, not the rule, and it changes from county to county.{' '}
            <Link href="/closing-costs/who-pays-title-insurance">
              Who pays for title insurance in each Florida county
            </Link>{' '}
            sets out the custom where it has been confirmed. The purchase contract decides it in
            every case.
          </p>

          <h2>What the premium does not include</h2>
          <p>The calculator prints the rule and the statutes. It does not price:</p>
          <ul>
            {UNPRICED.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>
            Those are quoted on the file. <Link href="/quote">Request a quote</Link> for an itemized
            figure, or see the <Link href="/closing-costs/buyer">buyer</Link> and{' '}
            <Link href="/closing-costs/seller">seller</Link> closing cost pages for which side of the
            statement each line falls on.
          </p>

          <h2>Common questions</h2>
          <Faq items={faq} />

          <p className="muted">
            Read from {PREMIUM_RULE.cite} on {formatLongDate(PREMIUM_CHECKED_ON)}. The rule was last
            amended {formatLongDate(PREMIUM_RULE.lastAmended)}. Tell us if a figure here does not
            match what you are quoted and we will check it against the rule again.
          </p>

          <QuietCta
            text="Send us the price, the loan and the county and we will itemize the whole closing, our fees included."
            action="Request a quote"
            href="/quote"
          />
        </div>
      </div>
    </>
  );
}
