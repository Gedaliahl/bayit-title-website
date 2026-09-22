// The Florida doc stamp calculator: documentary stamp tax on the deed and the
// mortgage, the Miami-Dade surtax, and the intangible tax, from a price, a
// loan and a county.
//
// Every figure is statutory and read from lib/statutory-rates.ts, which cites
// the section that sets it; the calculator and the tables are that file's
// arithmetic, arranged (lib/doc-stamps.ts). Who pays is the contract's, and
// the page says so rather than picking a side.

import type { Metadata } from 'next';
import Link from 'next/link';

import { getCounties } from '@/lib/locations';
import { siteOpenGraph, formatLongDate, metaDescription } from '@/lib/seo';
import {
  CHECKED_ON,
  DOR_DOC_STAMP_GUIDANCE,
  EXAMPLE_LOAN,
  EXAMPLE_PRICE,
  MORTGAGE_CHARGES,
  RENEWAL_NOTES,
  deedStampTax,
  deedStampTaxDue,
  discretionarySurtax,
  discretionarySurtaxDue,
  formatMoney,
  intangibleTaxDue,
  mortgageStampTaxDue,
} from '@/lib/statutory-rates';
import type { FaqItem } from '@/lib/faq';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { AnswerPanel } from '@/components/Prose';
import { CitedFigures } from '@/components/CitedFigures';
import { DocStampCalculator } from '@/components/DocStampCalculator';
import { Faq } from '@/components/Faq';
import { FaqSchema } from '@/components/Schema';
import { FigureTable } from '@/components/FigureTable';
import { QuietCta } from '@/components/QuietCta';

const PATH = '/closing-costs/doc-stamp-calculator';

/** Any county but Miami-Dade: the deed rate is the same in all 66 of them. */
const STATEWIDE = 'broward-county';
const DADE = 'miami-dade-county';

export const metadata: Metadata = {
  title: 'Florida doc stamp tax calculator',
  description: metaDescription(
    'Florida documentary stamp tax on the deed and the mortgage, the Miami-Dade surtax and the ' +
      'intangible tax, from a price, a loan and a county. Each rate cited to the statute.',
  ),
  alternates: { canonical: PATH },
  openGraph: { ...siteOpenGraph, url: PATH },
};

const TABLE_PRICES = [
  100_000, 200_000, 250_000, 300_000, 400_000, 500_000, 600_000, 750_000, 1_000_000, 1_500_000,
  2_000_000,
];

const TABLE_LOANS = [100_000, 200_000, 300_000, 400_000, 500_000, 750_000, 1_000_000];

export default async function DocStampCalculatorPage() {
  const counties = (await getCounties()).map((county) => ({ slug: county.slug, name: county.name }));

  const statewideDeed = deedStampTax(STATEWIDE);
  const dadeDeed = deedStampTax(DADE);
  const surtax = discretionarySurtax(DADE)!;
  const [mortgageStamps, intangible] = MORTGAGE_CHARGES;

  const exampleDeed = deedStampTaxDue(EXAMPLE_PRICE, STATEWIDE);
  const exampleMortgage = mortgageStampTaxDue(EXAMPLE_LOAN);
  const exampleIntangible = intangibleTaxDue(EXAMPLE_LOAN);

  const faq: FaqItem[] = [
    {
      question: 'How much are doc stamps in Florida?',
      answer:
        `On the deed, ${statewideDeed.amount} in every county but Miami-Dade, where it is ` +
        `${dadeDeed.amount}. On a mortgage, ${mortgageStamps.amount}. On a ` +
        `${formatMoney(EXAMPLE_PRICE)} sale that is ${formatMoney(exampleDeed)} on the deed, and a ` +
        `${formatMoney(EXAMPLE_LOAN)} mortgage adds ${formatMoney(exampleMortgage)}.`,
    },
    {
      question: 'Who pays the documentary stamp tax on the deed in Florida?',
      answer:
        'The statute taxes the deed; it does not say who pays. The purchase contract allocates it, ' +
        'and the standard Florida contract forms do so in a specific paragraph. Read yours rather ' +
        'than assuming.',
    },
    {
      question: 'Why is the deed rate lower in Miami-Dade?',
      answer:
        `${dadeDeed.note} Miami-Dade also levies a surtax of ${surtax.amount}, which is not charged ` +
        'where the interest conveyed involves only a single-family residence.',
    },
    {
      question: 'Is there a cap on doc stamps on a Florida mortgage?',
      answer: mortgageStamps.note!,
    },
    {
      question: 'What is the intangible tax?',
      answer:
        `A one-time tax on the obligation a mortgage secures: ${intangible.amount}. On a ` +
        `${formatMoney(EXAMPLE_LOAN)} loan it is ${formatMoney(exampleIntangible)}. A cash sale ` +
        'carries neither it nor the mortgage stamps.',
    },
    {
      question: 'Are doc stamps charged on a refinance?',
      answer: RENEWAL_NOTES.mortgageStamps,
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
              { name: 'Doc stamp calculator', path: PATH },
            ]}
          />
          <h1 className="after-crumbs">Florida doc stamp tax calculator</h1>

          <AnswerPanel
            text={
              `Florida taxes a deed at ${statewideDeed.amount} in 66 of its 67 counties. ` +
              `Miami-Dade is the exception: ${dadeDeed.amount}, plus a surtax of ${surtax.amount} ` +
              'unless the property is a single-family residence. A mortgage carries ' +
              `${mortgageStamps.amount} and an intangible tax of ${intangible.amount}. On a ` +
              `${formatMoney(EXAMPLE_PRICE)} sale the deed stamps are ${formatMoney(exampleDeed)}. ` +
              'Which side pays is decided by the purchase contract.'
            }
          />
        </div>
      </div>

      <section className="band estimator" aria-labelledby="doc-stamp-heading">
        <div className="frame band__inner">
          <div className="band__head">
            <h2 id="doc-stamp-heading">Work out the tax</h2>
            <span className="band__caption">Set by statute, in all 67 counties</span>
          </div>
          <DocStampCalculator counties={counties} />
        </div>
      </section>

      <div className="frame section">
        <div className="measure">
          <h2 className="flush-top">The rates, and the statutes that set them</h2>
          <CitedFigures
            figures={[
              { ...statewideDeed, label: 'Deed stamps, in 66 counties' },
              { ...dadeDeed, label: 'Deed stamps, in Miami-Dade' },
              { ...surtax, label: 'Miami-Dade surtax on the deed' },
              ...MORTGAGE_CHARGES,
            ]}
          />
          <p>
            The tax is charged on each part of $100, so it rounds up: a {formatMoney(500_050)} sale is
            taxed on 5,001 hundreds, not 5,000.5. The Department of Revenue publishes its own{' '}
            <a href={DOR_DOC_STAMP_GUIDANCE} rel="nofollow">
              guidance on the documentary stamp tax
            </a>
            , which is where the statute&rsquo;s description of Miami-Dade is confirmed.
          </p>

          <h2>Deed stamps at common prices</h2>
          <FigureTable
            caption="Documentary stamp tax on a Florida deed, by sale price"
            columns={['Sale price', 'Outside Miami-Dade', 'Miami-Dade', 'Miami-Dade surtax']}
            rows={TABLE_PRICES.map((price) => [
              formatMoney(price),
              formatMoney(deedStampTaxDue(price, STATEWIDE)),
              formatMoney(deedStampTaxDue(price, DADE)),
              formatMoney(discretionarySurtaxDue(price, DADE)),
            ])}
          />
          <p className="muted">
            The surtax column applies in Miami-Dade only, and only where what is conveyed is not a
            single-family residence.
          </p>

          <h2>Mortgage stamps and intangible tax at common loan amounts</h2>
          <FigureTable
            caption="Documentary stamp tax and intangible tax on a Florida mortgage, by loan amount"
            columns={['Loan amount', 'Mortgage stamps', 'Intangible tax', 'Together']}
            rows={TABLE_LOANS.map((loan) => [
              formatMoney(loan),
              formatMoney(mortgageStampTaxDue(loan)),
              formatMoney(intangibleTaxDue(loan)),
              formatMoney(mortgageStampTaxDue(loan) + intangibleTaxDue(loan)),
            ])}
          />

          <h2>On a refinance</h2>
          <p>{RENEWAL_NOTES.mortgageStamps}</p>
          <p>{RENEWAL_NOTES.intangible}</p>

          <h2>What else is on the statement</h2>
          <p>
            The transfer taxes are only part of a closing. The{' '}
            <Link href="/closing-costs/title-insurance-calculator">title insurance calculator</Link>{' '}
            works out the promulgated premium, and the{' '}
            <Link href="/estimate">Florida closing cost calculator</Link> adds the premium, these
            taxes and the recording together, from an address or from the contract numbers. Which
            side pays each line is on the <Link href="/closing-costs/buyer">buyer</Link> and{' '}
            <Link href="/closing-costs/seller">seller</Link> closing cost pages.
          </p>

          <h2>Common questions</h2>
          <Faq items={faq} />

          <p className="muted">
            Every rate on this page was read from the statute that sets it on{' '}
            {formatLongDate(CHECKED_ON)} and is linked to that section. Rates change by act of the
            Legislature — if one of these no longer matches what you are being charged, tell us and we
            will correct it. This page is not tax advice.
          </p>

          <QuietCta
            text="Send us the contract and we will put every line of the closing statement on one page, our fees included."
            action="Request a quote"
            href="/quote"
          />
        </div>
      </div>
    </>
  );
}
