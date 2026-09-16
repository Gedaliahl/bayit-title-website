// Title insurance priced from what the property appraiser has on record.
//
// The calculator at /calculator works from a purchase price, which is the right
// input and the one a reader often does not have yet. This is the other way in:
// an address, a county, and the assessed value the county property appraiser
// publishes for that parcel.
//
// The honest caveat is built into the output rather than left to the page.
// Under the promulgated rule an owner's policy is written for the full
// insurable value — in a purchase, the price. Florida's assessed value is a tax
// figure: it is capped year to year for homestead property under the Save Our
// Homes provision and is regularly well below what the property would sell for.
// So a premium computed from it is a FLOOR, not a quote, and every consumer of
// this module gets that word alongside the number.
//
// Nothing here is a Bayit Title price. The premium is promulgated; our own fee,
// the search and endorsements are not in this file — see UNPRICED in
// lib/closing-estimate.ts.

import type { EstimateLine } from './closing-estimate';
import {
  ORIGINAL_SCHEDULE,
  PREMIUM_RULE,
  REISSUE_SCHEDULE,
  originalPremium,
  reissuePremium,
  simultaneousLoanPremium,
} from './promulgated-premium';

export type Purpose = 'purchase' | 'refinance';

export interface AssessedInput {
  purpose: Purpose;
  /** The county's assessed (or just value) figure for the parcel, in dollars. */
  assessedValue: number;
  /** 0 for a cash purchase. On a refinance this is the whole of it. */
  loanAmount: number;
  /** The rule's reissue conditions are met — see REISSUE_CONDITIONS. */
  reissue: boolean;
}

export interface AssessedEstimate {
  lines: EstimateLine[];
  total: number;
  /** What the same coverage would cost at the other rate, for comparison. */
  alternateRateTotal: number | null;
}

export const ASSESSED_DEFAULTS: AssessedInput = {
  purpose: 'purchase',
  assessedValue: 0,
  loanAmount: 0,
  reissue: false,
};

const toCents = (value: number) => Math.round(value * 100) / 100;

/**
 * What the promulgated schedule produces for this coverage, and what it would
 * produce at the other rate. Premium only: the transfer taxes are charged on
 * consideration rather than on assessed value, so an assessed figure cannot
 * price them and this does not pretend otherwise.
 */
export function estimateFromAssessedValue(input: AssessedInput): AssessedEstimate {
  const coverage = Math.max(0, Math.floor(input.assessedValue));
  const loan = Math.max(0, Math.floor(input.loanAmount));
  const isPurchase = input.purpose === 'purchase';

  const lines: EstimateLine[] = [];

  const ownerRate = input.reissue ? reissuePremium : originalPremium;
  const otherRate = input.reissue ? originalPremium : reissuePremium;
  const rateCite = input.reissue ? REISSUE_SCHEDULE[0].cite : ORIGINAL_SCHEDULE[0].cite;

  let total = 0;
  let alternate = 0;

  if (isPurchase && coverage > 0) {
    const owner = ownerRate(coverage);
    lines.push({
      label: `Owner’s policy at the assessed value, ${input.reissue ? 'reissue rate' : 'original rate'}`,
      value: owner,
      cite: rateCite,
      sourceUrl: PREMIUM_RULE.url,
      note:
        'A policy is written for the full insurable value — in a sale, the price. Assessed value ' +
        'is usually lower, so read this as a floor.',
    });
    total += owner;
    alternate += otherRate(coverage);

    if (loan > 0) {
      const lender = simultaneousLoanPremium(loan, coverage);
      lines.push({
        label: 'Lender’s policy, issued at the same time',
        value: lender,
        cite: `${PREMIUM_RULE.cite}(5)(a)`,
        sourceUrl: PREMIUM_RULE.url,
        note:
          loan > coverage
            ? 'The loan is larger than the owner’s policy, so the excess is rated at the original schedule on top of the $25.'
            : '$25 for coverage up to the owner’s policy amount.',
      });
      total += lender;
      alternate += lender;
    }
  }

  if (!isPurchase && loan > 0) {
    const lender = ownerRate(loan);
    lines.push({
      label: `Lender’s policy, ${input.reissue ? 'reissue rate' : 'original rate'}`,
      value: lender,
      cite: rateCite,
      sourceUrl: PREMIUM_RULE.url,
      note:
        'A refinance is rated on the loan, not on the value of the property, so the assessed ' +
        'value does not enter into it. It has no owner’s policy alongside, so there is no $25 rate.',
    });
    total += lender;
    alternate += otherRate(loan);
  }

  return {
    lines,
    total: toCents(total),
    alternateRateTotal: lines.length > 0 ? toCents(alternate) : null,
  };
}

/** Named so a page can say which rate the comparison figure is at. */
export function otherRateLabel(reissue: boolean): string {
  return reissue ? 'original rate' : 'reissue rate';
}

/** What an assessed-value estimate cannot tell you, printed rather than omitted. */
export const ASSESSED_UNKNOWNS = [
  'The policy is written at the purchase price or full insurable value, not at the assessed value — on most Florida homes the assessed figure is the lower of the two.',
  'Documentary stamp tax, intangible tax and recording charges are computed on the consideration and the loan, not on assessed value, so they are not in this figure.',
  'Our settlement or closing fee, and the title search and examination.',
  'Endorsements the lender asks for, survey, municipal lien search, estoppel letters and association fees.',
];
