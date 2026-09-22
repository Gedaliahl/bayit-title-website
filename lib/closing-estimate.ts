// Everything on a Florida closing statement that somebody other than this
// office sets: the promulgated premium from the OIR rule, the transfer taxes
// from ch. 201 and ch. 199, and the recording charges from s. 28.24 — plus the
// two figures this office does set, which are named as ours rather than folded
// in.
//
// The boundary is still the point of the file, and it is now drawn on the line
// rather than at the edge of the module. A figure cites the rule or the statute
// only where a reader could open it and arrive at the same number; the lender's
// policy charge and the e-recording fee cite us, because nobody else sets them
// (see lib/agency-charges.ts). Our settlement fee, search and examination
// charges and the lender's own costs are still real money on the same closing
// statement and still not estimated here — see UNPRICED below, which the
// calculator prints rather than quietly omits.
//
// Every line also carries whose side of the table it lands on. That is a third
// kind of thing again — not the rule's, not the statute's and not ours, but the
// contract's, with local custom as the starting point — so it lives in
// lib/cost-allocation.ts and is printed on the line that it moves.

import {
  E_RECORDING_NOTE,
  LENDER_POLICY_NOTE,
  SET_BY,
  eRecordingDue,
  lenderPolicyCharge,
} from './agency-charges';
import {
  BORROWER_ONLY,
  DEED_RECORDING,
  DEED_TAX,
  type Allocation,
  type Party,
  type Payer,
  ownerPolicyAllocation,
  payableBy,
  withAllocation,
} from './cost-allocation';
import {
  ORIGINAL_SCHEDULE,
  PREMIUM_RULE,
  REISSUE_SCHEDULE,
  originalPremium,
  reissueExcessNote,
  reissuePremium,
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

export type { Party, Payer } from './cost-allocation';

export interface EstimateInput {
  transaction: Transaction;
  countySlug: string;
  /**
   * The county in words, for the one line whose side of the table it decides.
   * Only ever printed, never computed on — countySlug is what the rates key off.
   */
  countyName: string;
  /**
   * Whose statement this is. A purchase has two sides and some lines have only
   * one of them; a refinance has a borrower and nothing else, so this is
   * ignored there.
   */
  party: Party;
  /**
   * The locations table's `customaryOwnerPolicyPayer` for this county, or null
   * where nobody has verified it. Passed in rather than looked up: the table is
   * the site's, this module is arithmetic.
   */
  ownerPolicyCustom: string | null;
  /** Purchase price. Ignored on a refinance. */
  price: number;
  /** 0 for a cash closing. */
  loanAmount: number;
  /** The rule's reissue conditions are met — see REISSUE_CONDITIONS. */
  reissue: boolean;
  /**
   * What the previous policy insured for, which R. 69O-186.003(2)(c) needs: the
   * reissue schedule reaches only that far and the excess is at original rates.
   * 0 means nobody has told us, and the line says so.
   */
  priorPolicyAmount: number;
  /** Miami-Dade only: the surtax is not charged on a single-family residence. */
  singleFamilyResidence: boolean;
  deedPages: number;
  mortgagePages: number;
}

export interface EstimateLine {
  label: string;
  value: number;
  cite: string;
  /** Absent on a line this office sets — there is nothing to link a reader to. */
  sourceUrl?: string;
  note?: string;
  /** Whose side of the closing statement this lands on. */
  payer: Payer;
}

export interface EstimateGroup {
  title: string;
  lines: EstimateLine[];
  subtotal: number;
}

export interface Estimate {
  groups: EstimateGroup[];
  total: number;
  /** What the other side of the same closing carries, so neither reads alone. */
  otherPartyTotal: number;
}

export const DEFAULTS: EstimateInput = {
  transaction: 'purchase',
  countySlug: 'broward-county',
  countyName: 'Broward County',
  party: 'buyer',
  ownerPolicyCustom: null,
  price: 500_000,
  loanAmount: 400_000,
  reissue: false,
  priorPolicyAmount: 0,
  singleFamilyResidence: true,
  // A deed runs to three pages and a mortgage to twenty-five often enough that
  // these are the figures to start a reader on; both boxes are theirs to change
  // once they have the documents in front of them.
  deedPages: 3,
  mortgagePages: 25,
};

/**
 * The reissue conditions, as a seller or an owner meets them in practice.
 *
 * The rule's shape is a precondition and then a choice. R. 69O-186.003(2)(b)
 * requires a previous owner's policy insuring the seller or mortgagor, with
 * copies retained by both the agent and the underwriter — that is the first
 * item below and it is required in every case. It then lists three alternatives,
 * any one of which will do. The first of those three, unimproved land except for
 * roads, bridges, drainage and utilities, is deliberately not printed: it almost
 * never decides one of our files, and a reader working out whether the reissue
 * rate applies to a house is better served by the two they might meet. Ask us on
 * a land file and we will check the rule against it.
 */
export const REISSUE_CONDITIONS = [
  'The owner’s or the seller’s own title was insured, and both we and the underwriter keep a copy of that policy.',
  'The new policy is dated less than three years after the policy that insured the owner or seller — this is the common one.',
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

/** A line, and the allocation folded into its note so the two are never apart. */
function allocate(
  line: Omit<EstimateLine, 'payer'>,
  allocation: Allocation,
): EstimateLine {
  return { ...line, payer: allocation.payer, note: withAllocation(line.note, allocation) };
}

export function estimate(input: EstimateInput): Estimate {
  const {
    transaction,
    countySlug,
    countyName,
    ownerPolicyCustom,
    reissue,
    priorPolicyAmount,
    singleFamilyResidence,
    deedPages,
    mortgagePages,
  } = input;

  const isPurchase = transaction === 'purchase';
  const price = isPurchase ? Math.max(0, input.price) : 0;
  const loan = Math.max(0, input.loanAmount);
  // A refinance has one party. Whoever the toggle was left on, the borrower is
  // the only person on that statement, so nothing is filtered away from them.
  const party: Party = isPurchase ? input.party : 'buyer';
  const ownerPolicy = ownerPolicyAllocation(ownerPolicyCustom, countyName);

  const premiumLines: EstimateLine[] = [];
  const schedule = reissue ? REISSUE_SCHEDULE : ORIGINAL_SCHEDULE;
  const scheduleCite = schedule[0].cite;

  if (isPurchase && price > 0) {
    premiumLines.push(
      allocate(
        {
          label: `Owner’s policy, ${reissue ? 'reissue rate' : 'original rate'}`,
          value: reissue ? reissuePremium(price, priorPolicyAmount) : originalPremium(price),
          cite: scheduleCite,
          sourceUrl: PREMIUM_RULE.url,
          note: reissue
            ? `Written for the full insurable value of the property. ${reissueExcessNote(price, priorPolicyAmount)}`
            : 'Written for the full insurable value of the property.',
        },
        ownerPolicy,
      ),
    );

    if (loan > 0) {
      premiumLines.push(
        allocate(
          {
            label: 'Lender’s policy, issued simultaneously',
            value: lenderPolicyCharge(loan, price),
            cite: SET_BY,
            note:
              loan > price
                ? `${LENDER_POLICY_NOTE} The loan is larger than the owner’s policy, so the excess coverage is rated at the original schedule on top of the charge.`
                : LENDER_POLICY_NOTE,
          },
          BORROWER_ONLY,
        ),
      );
    }
  }

  if (!isPurchase && loan > 0) {
    premiumLines.push(
      allocate(
        {
          label: `Lender’s policy, ${reissue ? 'reissue rate' : 'original rate'}`,
          value: reissue ? reissuePremium(loan, priorPolicyAmount) : originalPremium(loan),
          cite: scheduleCite,
          sourceUrl: PREMIUM_RULE.url,
          note: reissue
            ? `A refinance has no owner’s policy to issue alongside, so it is rated on the schedule rather than charged as an addition to one. ${reissueExcessNote(loan, priorPolicyAmount)}`
            : 'A refinance has no owner’s policy to issue alongside, so it is rated on the schedule rather than charged as an addition to one.',
        },
        BORROWER_ONLY,
      ),
    );
  }

  const taxLines: EstimateLine[] = [];

  if (isPurchase && price > 0) {
    const deed = deedStampTax(countySlug);
    taxLines.push(
      allocate(
        {
          label: deed.label,
          value: deedStampTaxDue(price, countySlug),
          cite: deed.cite,
          sourceUrl: deed.sourceUrl,
        },
        DEED_TAX,
      ),
    );

    const surtax = discretionarySurtax(countySlug);
    if (surtax && !singleFamilyResidence) {
      taxLines.push(
        allocate(
          {
            label: surtax.label,
            value: discretionarySurtaxDue(price, countySlug),
            cite: surtax.cite,
            sourceUrl: surtax.sourceUrl,
            note: 'Charged because what is being conveyed is not a single-family residence.',
          },
          DEED_TAX,
        ),
      );
    }
  }

  if (loan > 0) {
    taxLines.push(
      allocate(
        {
          label: 'Documentary stamp tax on the mortgage',
          value: mortgageStampTaxDue(loan),
          cite: 'Fla. Stat. § 201.08(1)(b)',
          sourceUrl: DOR_DOC_STAMP_GUIDANCE,
        },
        BORROWER_ONLY,
      ),
    );
    taxLines.push(
      allocate(
        {
          label: 'Nonrecurring intangible tax',
          value: intangibleTaxDue(loan),
          cite: 'Fla. Stat. § 199.133(1)',
          sourceUrl: DOR_DOC_STAMP_GUIDANCE,
        },
        BORROWER_ONLY,
      ),
    );
  }

  const recordingLines: EstimateLine[] = [];
  const recordingCite = 'Fla. Stat. § 28.24(13)';
  const recordingUrl =
    'https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0000-0099/0028/Sections/0028.24.html';

  // Each document brings two lines: the clerk's per-page charge, and the
  // e-recording fee for sending it. They are kept beside each other and
  // allocated together, because a document does not get recorded by one side
  // and e-recorded by the other.
  if (isPurchase && price > 0 && deedPages > 0) {
    recordingLines.push(
      allocate(
        {
          label: `Recording the deed, ${deedPages} page${deedPages === 1 ? '' : 's'}`,
          value: recordingChargeDue(deedPages),
          cite: recordingCite,
          sourceUrl: recordingUrl,
        },
        DEED_RECORDING,
      ),
      allocate(
        {
          label: 'E-recording the deed',
          value: eRecordingDue(1),
          cite: SET_BY,
          note: E_RECORDING_NOTE,
        },
        DEED_RECORDING,
      ),
    );
  }

  if (loan > 0 && mortgagePages > 0) {
    recordingLines.push(
      allocate(
        {
          label: `Recording the mortgage, ${mortgagePages} page${mortgagePages === 1 ? '' : 's'}`,
          value: recordingChargeDue(mortgagePages),
          cite: recordingCite,
          sourceUrl: recordingUrl,
        },
        BORROWER_ONLY,
      ),
      allocate(
        {
          label: 'E-recording the mortgage',
          value: eRecordingDue(1),
          cite: SET_BY,
          note: E_RECORDING_NOTE,
        },
        BORROWER_ONLY,
      ),
    );
  }

  const all = [
    { title: 'Title insurance premium', lines: premiumLines },
    { title: 'Tax on the transfer', lines: taxLines },
    { title: 'Recording', lines: recordingLines },
  ];

  const groups: EstimateGroup[] = all
    .map(({ title, lines }) => {
      const mine = lines.filter((line) => payableBy(line.payer, party));
      return { title, lines: mine, subtotal: sum(mine) };
    })
    .filter((group) => group.lines.length > 0);

  const other: Party = party === 'buyer' ? 'seller' : 'buyer';

  return {
    groups,
    total: Math.round(groups.reduce((running, group) => running + group.subtotal, 0) * 100) / 100,
    otherPartyTotal: isPurchase
      ? sum(all.flatMap(({ lines }) => lines.filter((line) => payableBy(line.payer, other))))
      : 0,
  };
}
