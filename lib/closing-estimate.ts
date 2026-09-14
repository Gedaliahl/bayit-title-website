// Everything on a Florida closing statement that somebody other than this
// office sets: the promulgated premium from the OIR rule, the transfer taxes
// from ch. 201 and ch. 199, and the recording charges from s. 28.24.
//
// The boundary is the point of the file. A figure belongs here only if a reader
// could open the rule or the statute and arrive at the same number. Our own
// settlement fee, search and examination charges, endorsements and the lender's
// costs are all real money on the same closing statement and none of them are
// promulgated, so none of them are estimated here — see UNPRICED below, which
// the calculator prints rather than quietly omits.

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

export type Transaction = 'purchase' | 'refinance';

export interface EstimateInput {
  transaction: Transaction;
  countySlug: string;
  /** Purchase price. Ignored on a refinance. */
  price: number;
  /** 0 for a cash closing. */
  loanAmount: number;
  /** The rule's reissue conditions are met — see REISSUE_CONDITIONS. */
  reissue: boolean;
  /** Miami-Dade only: the surtax is not charged on a single-family residence. */
  singleFamilyResidence: boolean;
  deedPages: number;
  mortgagePages: number;
}

export interface EstimateLine {
  label: string;
  value: number;
  cite: string;
  sourceUrl: string;
  note?: string;
}

export interface EstimateGroup {
  title: string;
  lines: EstimateLine[];
  subtotal: number;
}

export interface Estimate {
  groups: EstimateGroup[];
  total: number;
}

export const DEFAULTS: EstimateInput = {
  transaction: 'purchase',
  countySlug: 'broward-county',
  price: 500_000,
  loanAmount: 400_000,
  reissue: false,
  singleFamilyResidence: true,
  deedPages: 2,
  mortgagePages: 12,
};

/** R. 69O-186.003(2)(b), in the order the rule lists them. */
export const REISSUE_CONDITIONS = [
  'The seller’s own title was insured, and both we and the underwriter keep a copy of that policy.',
  'The new policy is dated less than three years after the policy that insured the seller — this is the common one.',
  'Or the land is unimproved except for roads, drainage and utilities and the current owner’s title was insured.',
  'Or it is a mortgage policy on a refinance of property insured by an owner’s policy that insured this same borrower.',
];

/** Named so the calculator can say what it is not telling you. */
export const UNPRICED = [
  'Our settlement or closing fee',
  'Title search and examination',
  'Endorsements the lender asks for',
  'Survey, municipal lien search, estoppel letters and association fees',
  'The lender’s own charges, prepaid interest, escrows and prorations',
];

const sum = (lines: EstimateLine[]) =>
  Math.round(lines.reduce((total, line) => total + line.value, 0) * 100) / 100;

export function estimate(input: EstimateInput): Estimate {
  const {
    transaction,
    countySlug,
    reissue,
    singleFamilyResidence,
    deedPages,
    mortgagePages,
  } = input;

  const isPurchase = transaction === 'purchase';
  const price = isPurchase ? Math.max(0, input.price) : 0;
  const loan = Math.max(0, input.loanAmount);

  const premiumLines: EstimateLine[] = [];
  const schedule = reissue ? REISSUE_SCHEDULE : ORIGINAL_SCHEDULE;
  const scheduleCite = schedule[0].cite;

  if (isPurchase && price > 0) {
    premiumLines.push({
      label: `Owner’s policy, ${reissue ? 'reissue rate' : 'original rate'}`,
      value: reissue ? reissuePremium(price) : originalPremium(price),
      cite: scheduleCite,
      sourceUrl: PREMIUM_RULE.url,
      note: 'Written for the full insurable value of the property.',
    });

    if (loan > 0) {
      premiumLines.push({
        label: 'Lender’s policy, issued simultaneously',
        value: simultaneousLoanPremium(loan, price),
        cite: `${PREMIUM_RULE.cite}(5)(a)`,
        sourceUrl: PREMIUM_RULE.url,
        note:
          loan > price
            ? 'The loan is larger than the owner’s policy, so the excess is rated at the original schedule on top of the $25.'
            : '$25 for coverage up to the owner’s policy amount.',
      });
    }
  }

  if (!isPurchase && loan > 0) {
    premiumLines.push({
      label: `Lender’s policy, ${reissue ? 'reissue rate' : 'original rate'}`,
      value: reissue ? reissuePremium(loan) : originalPremium(loan),
      cite: scheduleCite,
      sourceUrl: PREMIUM_RULE.url,
      note: 'A refinance has no owner’s policy to issue alongside, so there is no $25 rate here.',
    });
  }

  const taxLines: EstimateLine[] = [];

  if (isPurchase && price > 0) {
    const deed = deedStampTax(countySlug);
    taxLines.push({
      label: deed.label,
      value: deedStampTaxDue(price, countySlug),
      cite: deed.cite,
      sourceUrl: deed.sourceUrl,
    });

    const surtax = discretionarySurtax(countySlug);
    if (surtax && !singleFamilyResidence) {
      taxLines.push({
        label: surtax.label,
        value: discretionarySurtaxDue(price, countySlug),
        cite: surtax.cite,
        sourceUrl: surtax.sourceUrl,
        note: 'Charged because what is being conveyed is not a single-family residence.',
      });
    }
  }

  if (loan > 0) {
    taxLines.push({
      label: 'Documentary stamp tax on the mortgage',
      value: mortgageStampTaxDue(loan),
      cite: 'Fla. Stat. § 201.08(1)(b)',
      sourceUrl: DOR_DOC_STAMP_GUIDANCE,
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

  if (isPurchase && price > 0 && deedPages > 0) {
    recordingLines.push({
      label: `Recording the deed, ${deedPages} page${deedPages === 1 ? '' : 's'}`,
      value: recordingChargeDue(deedPages),
      cite: recordingCite,
      sourceUrl: recordingUrl,
    });
  }

  if (loan > 0 && mortgagePages > 0) {
    recordingLines.push({
      label: `Recording the mortgage, ${mortgagePages} page${mortgagePages === 1 ? '' : 's'}`,
      value: recordingChargeDue(mortgagePages),
      cite: recordingCite,
      sourceUrl: recordingUrl,
    });
  }

  const groups: EstimateGroup[] = [
    { title: 'Title insurance premium', lines: premiumLines, subtotal: sum(premiumLines) },
    { title: 'Tax on the transfer', lines: taxLines, subtotal: sum(taxLines) },
    { title: 'Recording', lines: recordingLines, subtotal: sum(recordingLines) },
  ].filter((group) => group.lines.length > 0);

  return {
    groups,
    total: Math.round(groups.reduce((running, group) => running + group.subtotal, 0) * 100) / 100,
  };
}
