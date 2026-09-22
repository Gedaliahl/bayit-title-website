// Florida's transfer taxes on a sale and its mortgage, as groups of cited
// lines for the doc stamp calculator. The arithmetic and the citations are
// lib/statutory-rates.ts's; this only arranges them, so the calculator and the
// estimate page can never price the same deed differently.

import type { EstimateGroup, EstimateLine } from './closing-estimate';
import {
  MORTGAGE_CHARGES,
  deedStampTax,
  deedStampTaxDue,
  discretionarySurtax,
  discretionarySurtaxDue,
  intangibleTaxDue,
  mortgageStampTaxDue,
} from './statutory-rates';

export interface DocStampInput {
  price: number;
  /** 0 for a cash sale. */
  loanAmount: number;
  countySlug: string;
  /** Miami-Dade only: the surtax is not charged on a single-family residence. */
  singleFamilyResidence: boolean;
}

/** The statute taxes the document and says nothing about who pays it. */
const CONTRACT_DECIDES = 'Which side pays is decided by the purchase contract, not the statute.';

const sum = (lines: EstimateLine[]) =>
  Math.round(lines.reduce((total, line) => total + line.value, 0) * 100) / 100;

const dollars = (value: number) => (Number.isFinite(value) ? Math.max(0, value) : 0);

export function docStampGroups(input: DocStampInput): EstimateGroup[] {
  const price = dollars(input.price);
  const loan = dollars(input.loanAmount);
  const groups: EstimateGroup[] = [];

  if (price > 0) {
    const deed = deedStampTax(input.countySlug);
    const lines: EstimateLine[] = [
      {
        label: deed.label,
        value: deedStampTaxDue(price, input.countySlug),
        cite: deed.cite,
        sourceUrl: deed.sourceUrl,
        note: `${deed.amount}. ${CONTRACT_DECIDES}`,
        payer: 'either',
      },
    ];

    const surtax = discretionarySurtax(input.countySlug);
    if (surtax && !input.singleFamilyResidence) {
      lines.push({
        label: surtax.label,
        value: discretionarySurtaxDue(price, input.countySlug),
        cite: surtax.cite,
        sourceUrl: surtax.sourceUrl,
        note: `${surtax.amount}. ${surtax.note}`,
        payer: 'either',
      });
    }

    groups.push({ title: 'On the deed', lines, subtotal: sum(lines) });
  }

  if (loan > 0) {
    const [stamps, intangible] = MORTGAGE_CHARGES;
    const lines: EstimateLine[] = [
      {
        label: stamps.label,
        value: mortgageStampTaxDue(loan),
        cite: stamps.cite,
        sourceUrl: stamps.sourceUrl,
        note: `${stamps.amount}. There is no cap on the tax on a mortgage.`,
        payer: 'buyer',
      },
      {
        label: intangible.label,
        value: intangibleTaxDue(loan),
        cite: intangible.cite,
        sourceUrl: intangible.sourceUrl,
        note: `${intangible.amount}. ${intangible.note}`,
        payer: 'buyer',
      },
    ];
    groups.push({ title: 'On the mortgage', lines, subtotal: sum(lines) });
  }

  return groups;
}

export function docStampTotal(groups: EstimateGroup[]): number {
  return Math.round(groups.reduce((total, group) => total + group.subtotal, 0) * 100) / 100;
}
