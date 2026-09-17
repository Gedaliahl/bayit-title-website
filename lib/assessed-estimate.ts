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
// The county enters into it twice. It decides which property appraiser
// published the value, and it decides the rate of documentary stamp tax on the
// deed: Miami-Dade charges 60 cents per $100 where the rest of Florida charges
// 70, and adds a surtax on anything that is not a single-family residence. So
// the transfer taxes and the recording charges are estimated here as well as
// the premium — with the caveat, printed on every one of those lines, that they
// are charged on the consideration and are being computed on a valuation figure
// standing in for a price nobody has told us yet.
//
// Nothing here is a Bayit Title price. The premium is promulgated; our own fee,
// the search and endorsements are not in this file — see UNPRICED in
// lib/closing-estimate.ts.

import { DEFAULTS as CLOSING_DEFAULTS, type EstimateGroup, type EstimateLine } from './closing-estimate';
import {
  ORIGINAL_SCHEDULE,
  PREMIUM_RULE,
  REISSUE_SCHEDULE,
  originalPremium,
  reissuePremium,
  simultaneousLoanPremium,
} from './promulgated-premium';
import {
  DOR_DOC_STAMP_GUIDANCE,
  deedStampTax,
  deedStampTaxDue,
  discretionarySurtax,
  discretionarySurtaxDue,
  intangibleTaxDue,
  mortgageStampTaxDue,
  recordingChargeDue,
} from './statutory-rates';

export type Purpose = 'purchase' | 'refinance';

export interface AssessedInput {
  purpose: Purpose;
  /** Decides the deed stamp rate and the surtax, and nothing about the premium. */
  countySlug: string;
  /** The county's assessed (or just value) figure for the parcel, in dollars. */
  assessedValue: number;
  /** 0 for a cash purchase. On a refinance this is the whole of it. */
  loanAmount: number;
  /** The rule's reissue conditions are met — see REISSUE_CONDITIONS. */
  reissue: boolean;
  /** Miami-Dade only: the surtax is not charged on a single-family residence. */
  singleFamilyResidence: boolean;
}

export interface AssessedEstimate {
  groups: EstimateGroup[];
  /** The promulgated premium alone — the part that runs the same in all 67 counties. */
  premiumTotal: number;
  total: number;
  /** What the same coverage would cost at the other rate, for comparison. */
  alternateRateTotal: number | null;
}

export const ASSESSED_DEFAULTS: AssessedInput = {
  purpose: 'purchase',
  countySlug: 'broward-county',
  assessedValue: 0,
  loanAmount: 0,
  reissue: false,
  singleFamilyResidence: true,
};

/**
 * How many pages the deed and the mortgage are assumed to run to.
 *
 * The recording charge is per page and nobody looking at an address knows the
 * page count yet, so these are the calculator's own defaults rather than a
 * second set to keep in step. A page either way is $8.50.
 */
const DEED_PAGES = CLOSING_DEFAULTS.deedPages;
const MORTGAGE_PAGES = CLOSING_DEFAULTS.mortgagePages;

/** Printed on every line that is charged on consideration and computed on a value. */
const STAND_IN_NOTE =
  'Charged on the consideration, which nobody has told us yet — this is the appraiser’s ' +
  'value standing in for the price. On a sale above it, the tax is higher.';

const toCents = (value: number) => Math.round(value * 100) / 100;

const sum = (lines: EstimateLine[]) =>
  toCents(lines.reduce((running, line) => running + line.value, 0));

/**
 * What the promulgated schedule produces for this coverage, what it would
 * produce at the other rate, and what the state and the county charge on top.
 *
 * The premium is the certain part: the schedule is promulgated and the only
 * uncertainty in it is the coverage amount. The taxes below it are the
 * uncertain part twice over — they are charged on the consideration rather than
 * on any assessed value, and the deed rate itself depends on the county — so
 * they are kept in their own group, noted line by line, and left out of the
 * premium subtotal the page leads with.
 */
export function estimateFromAssessedValue(input: AssessedInput): AssessedEstimate {
  const coverage = Math.max(0, Math.floor(input.assessedValue));
  const loan = Math.max(0, Math.floor(input.loanAmount));
  const isPurchase = input.purpose === 'purchase';
  const { countySlug } = input;

  const premiumLines: EstimateLine[] = [];

  const ownerRate = input.reissue ? reissuePremium : originalPremium;
  const otherRate = input.reissue ? originalPremium : reissuePremium;
  const rateCite = input.reissue ? REISSUE_SCHEDULE[0].cite : ORIGINAL_SCHEDULE[0].cite;

  let alternate = 0;

  if (isPurchase && coverage > 0) {
    premiumLines.push({
      label: `Owner’s policy at the assessed value, ${input.reissue ? 'reissue rate' : 'original rate'}`,
      value: ownerRate(coverage),
      cite: rateCite,
      sourceUrl: PREMIUM_RULE.url,
      note:
        'A policy is written for the full insurable value — in a sale, the price. Assessed value ' +
        'is usually lower, so read this as a floor.',
    });
    alternate += otherRate(coverage);

    if (loan > 0) {
      const lender = simultaneousLoanPremium(loan, coverage);
      premiumLines.push({
        label: 'Lender’s policy, issued at the same time',
        value: lender,
        cite: `${PREMIUM_RULE.cite}(5)(a)`,
        sourceUrl: PREMIUM_RULE.url,
        note:
          loan > coverage
            ? 'The loan is larger than the owner’s policy, so the excess is rated at the original schedule on top of the $25.'
            : '$25 for coverage up to the owner’s policy amount.',
      });
      alternate += lender;
    }
  }

  if (!isPurchase && loan > 0) {
    premiumLines.push({
      label: `Lender’s policy, ${input.reissue ? 'reissue rate' : 'original rate'}`,
      value: ownerRate(loan),
      cite: rateCite,
      sourceUrl: PREMIUM_RULE.url,
      note:
        'A refinance is rated on the loan, not on the value of the property, so the assessed ' +
        'value does not enter into it. It has no owner’s policy alongside, so there is no $25 rate.',
    });
    alternate += otherRate(loan);
  }

  const taxLines: EstimateLine[] = [];

  if (isPurchase && coverage > 0) {
    const deed = deedStampTax(countySlug);
    taxLines.push({
      label: deed.label,
      value: deedStampTaxDue(coverage, countySlug),
      cite: deed.cite,
      sourceUrl: deed.sourceUrl,
      // deed.note is what makes this the one line on the page that a county
      // changes, so it is carried through rather than replaced.
      note: deed.note ? `${deed.note} ${STAND_IN_NOTE}` : STAND_IN_NOTE,
    });

    const surtax = discretionarySurtax(countySlug);
    if (surtax && !input.singleFamilyResidence) {
      taxLines.push({
        label: surtax.label,
        value: discretionarySurtaxDue(coverage, countySlug),
        cite: surtax.cite,
        sourceUrl: surtax.sourceUrl,
        note: `Charged because what is being conveyed is not a single-family residence. ${STAND_IN_NOTE}`,
      });
    }
  }

  if (loan > 0) {
    // The two charges on the loan are the certain ones here: the loan amount is
    // the loan amount, so no value is standing in for anything.
    taxLines.push({
      label: 'Documentary stamp tax on the mortgage',
      value: mortgageStampTaxDue(loan),
      cite: 'Fla. Stat. § 201.08(1)(b)',
      sourceUrl: DOR_DOC_STAMP_GUIDANCE,
      note: 'Charged on the loan, so this one does not depend on the value at all.',
    });
    taxLines.push({
      label: 'Nonrecurring intangible tax',
      value: intangibleTaxDue(loan),
      cite: 'Fla. Stat. § 199.133(1)',
      sourceUrl: DOR_DOC_STAMP_GUIDANCE,
    });
  }

  const recordingLines: EstimateLine[] = [];
  const recordingCite = 'Fla. Stat. § 28.24(13)';
  const recordingUrl =
    'https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0000-0099/0028/Sections/0028.24.html';

  if (isPurchase && coverage > 0) {
    recordingLines.push({
      label: `Recording the deed, ${DEED_PAGES} pages`,
      value: recordingChargeDue(DEED_PAGES),
      cite: recordingCite,
      sourceUrl: recordingUrl,
      note: 'Assumes a deed of the usual length; the charge is $8.50 a page after the first.',
    });
  }

  if (loan > 0) {
    recordingLines.push({
      label: `Recording the mortgage, ${MORTGAGE_PAGES} pages`,
      value: recordingChargeDue(MORTGAGE_PAGES),
      cite: recordingCite,
      sourceUrl: recordingUrl,
      note: 'A mortgage runs longer than a deed, and lenders differ on how much longer.',
    });
  }

  const groups: EstimateGroup[] = [
    { title: 'Title insurance premium', lines: premiumLines, subtotal: sum(premiumLines) },
    { title: 'Tax on the transfer', lines: taxLines, subtotal: sum(taxLines) },
    { title: 'Recording', lines: recordingLines, subtotal: sum(recordingLines) },
  ].filter((group) => group.lines.length > 0);

  return {
    groups,
    premiumTotal: sum(premiumLines),
    total: toCents(groups.reduce((running, group) => running + group.subtotal, 0)),
    alternateRateTotal: premiumLines.length > 0 ? toCents(alternate) : null,
  };
}

/** Named so a page can say which rate the comparison figure is at. */
export function otherRateLabel(reissue: boolean): string {
  return reissue ? 'original rate' : 'reissue rate';
}

/** What an assessed-value estimate cannot tell you, printed rather than omitted. */
export const ASSESSED_UNKNOWNS = [
  'The policy is written at the purchase price or full insurable value, not at the assessed value — on most Florida homes the assessed figure is the lower of the two.',
  'Documentary stamp tax and the surtax are charged on the consideration. Until there is a contract price, the figures above compute them on the appraiser’s value instead, which is the same substitution and the same direction of error.',
  'Our settlement or closing fee, and the title search and examination.',
  'Endorsements the lender asks for, survey, municipal lien search, estoppel letters and association fees.',
];
