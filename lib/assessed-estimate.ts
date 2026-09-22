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
// The county enters into it three times. It decides which property appraiser
// published the value; it decides the rate of documentary stamp tax on the
// deed, since Miami-Dade charges 60 cents per $100 where the rest of Florida
// charges 70 and adds a surtax on anything that is not a single-family
// residence; and its local custom is the starting point for which side of the
// closing pays for the owner's policy. So the transfer taxes and the recording
// charges are estimated here as well as the premium — with the caveat, printed
// on every one of those lines, that they are charged on the consideration and
// are being computed on a valuation figure standing in for a price nobody has
// told us yet — and every line says whose it is.
//
// Two figures here are this office's rather than the rule's or the statute's:
// what the lender's policy is issued for, and the e-recording fee. They cite us
// rather than an authority — see lib/agency-charges.ts. Our settlement fee, the
// search and endorsements are still not in this file — see UNPRICED in
// lib/closing-estimate.ts.

import {
  E_RECORDING_NOTE,
  LENDER_POLICY_NOTE,
  SET_BY,
  eRecordingDue,
  lenderPolicyCharge,
} from './agency-charges';
import { EXAMPLE_PAGE_COUNTS, type EstimateGroup, type EstimateLine } from './closing-estimate';
import {
  BORROWER_ONLY,
  DEED_RECORDING,
  DEED_TAX,
  type Allocation,
  type Party,
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
  RENEWAL_NOTES,
  intangibleTaxDue,
  mortgageStampTaxDue,
  recordingChargeDue,
} from './statutory-rates';

export type Purpose = 'purchase' | 'refinance';

export interface AssessedInput {
  purpose: Purpose;
  /** Decides the deed stamp rate and the surtax, and nothing about the premium. */
  countySlug: string;
  /** The county in words, for the lines that say whose side they fall on. */
  countyName: string;
  /** Whose statement this is. Ignored on a refinance, which has one party. */
  party: Party;
  /** The locations table's `customaryOwnerPolicyPayer`, or null where unverified. */
  ownerPolicyCustom: string | null;
  /** The county's assessed (or just value) figure for the parcel, in dollars. */
  assessedValue: number;
  /** Which figure assessedValue is, so the premium line can say what it was priced on. */
  valueBasis: ValueBasis;
  /** 0 for a cash purchase. On a refinance this is the whole of it. */
  loanAmount: number;
  /** The rule's reissue conditions are met — see REISSUE_CONDITIONS. */
  reissue: boolean;
  /** R. 69O-186.003(2)(c) — see EstimateInput.priorPolicyAmount. */
  priorPolicyAmount: number;
  /** Miami-Dade only: the surtax is not charged on a single-family residence. */
  singleFamilyResidence: boolean;
}

export interface AssessedEstimate {
  groups: EstimateGroup[];
  /** The policy charges alone — the part that runs the same in all 67 counties. */
  premiumTotal: number;
  total: number;
  /** What the same coverage would cost at the other rate, for comparison. */
  alternateRateTotal: number | null;
  /** What the other side carries, leaving out a line shown to both — see Estimate. */
  otherPartyTotal: number;
  /** An owner's policy is on both statements, so otherPartyTotal leaves it out and says so. */
  ownerPolicyUnassigned: boolean;
}

/**
 * The figure in the value box. The roll's two figures are floors for
 * different reasons; a figure the reader typed may be the price itself, so
 * it is not called one.
 */
export type ValueBasis = 'just' | 'assessed' | 'typed';

const VALUE_NAMES: Record<ValueBasis, string> = {
  just: 'the just value',
  assessed: 'the assessed value',
  typed: 'the value entered',
};

const FLOOR_NOTES: Record<ValueBasis, string> = {
  just: ' The just value on the roll is a tax figure, not a sale price, so read this as a floor.',
  assessed: ' Assessed value is usually lower, so read this as a floor.',
  typed: '',
};

export const ASSESSED_DEFAULTS: AssessedInput = {
  purpose: 'purchase',
  countySlug: 'broward-county',
  countyName: 'Broward County',
  party: 'buyer',
  ownerPolicyCustom: null,
  assessedValue: 0,
  valueBasis: 'assessed',
  loanAmount: 0,
  reissue: false,
  priorPolicyAmount: 0,
  singleFamilyResidence: true,
};

/**
 * How many pages the deed and the mortgage are assumed to run to.
 *
 * The recording charge is per page and nobody looking at an address knows the
 * page count yet, so these are the calculator's own defaults rather than a
 * second set to keep in step. A page either way is $8.50.
 */
const DEED_PAGES = EXAMPLE_PAGE_COUNTS.deed;
const MORTGAGE_PAGES = EXAMPLE_PAGE_COUNTS.mortgage;

/** Printed on every line that is charged on consideration and computed on a value. */
const STAND_IN_NOTE =
  'Charged on the consideration, which nobody has told us yet — this is the appraiser’s ' +
  'value standing in for the price. On a sale above it, the tax is higher.';

const toCents = (value: number) => Math.round(value * 100) / 100;

/** A negative, NaN or infinite figure is no figure, never a credit. */
const dollars = (value: number) => (Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0);

const sum = (lines: EstimateLine[]) =>
  toCents(lines.reduce((running, line) => running + line.value, 0));

/** A line, and the allocation folded into its note so the two are never apart. */
function allocate(line: Omit<EstimateLine, 'payer'>, allocation: Allocation): EstimateLine {
  return { ...line, payer: allocation.payer, note: withAllocation(line.note, allocation) };
}

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
 *
 * Everything returned is one side's: the lines the other party carries are
 * filtered out before anything is totalled, and what they add up to comes back
 * as otherPartyTotal so the page can say so rather than leave it unsaid.
 */
export function estimateFromAssessedValue(input: AssessedInput): AssessedEstimate {
  const coverage = dollars(input.assessedValue);
  const loan = dollars(input.loanAmount);
  const prior = dollars(input.priorPolicyAmount);
  const isPurchase = input.purpose === 'purchase';

  // A purchase with no value to stand in for the price has nothing to price:
  // the loan taxes alone, with no policy under them, are not a closing.
  if (isPurchase && coverage <= 0) {
    return {
      groups: [],
      premiumTotal: 0,
      total: 0,
      alternateRateTotal: null,
      otherPartyTotal: 0,
      ownerPolicyUnassigned: false,
    };
  }

  const { countySlug, countyName } = input;
  // A refinance has one party, so nothing is filtered away from the borrower.
  const party: Party = isPurchase ? input.party : 'buyer';
  const ownerPolicy = ownerPolicyAllocation(input.ownerPolicyCustom, countyName);

  const premiumLines: EstimateLine[] = [];

  const ownerRate = (amount: number) =>
    input.reissue ? reissuePremium(amount, prior) : originalPremium(amount);
  const otherRate = (amount: number) =>
    input.reissue ? originalPremium(amount) : reissuePremium(amount, prior);
  const rateCite = input.reissue ? REISSUE_SCHEDULE[0].cite : ORIGINAL_SCHEDULE[0].cite;

  // Accumulated against the lines the reader is actually shown, so the
  // comparison is never against coverage they are not being asked to pay for.
  let alternate = 0;
  const countsForReader = (allocation: Allocation) => payableBy(allocation.payer, party);

  if (isPurchase) {
    premiumLines.push(
      allocate(
        {
          label: `Owner’s policy at ${VALUE_NAMES[input.valueBasis]}, ${input.reissue ? 'reissue rate' : 'original rate'}`,
          value: ownerRate(coverage),
          cite: rateCite,
          sourceUrl: PREMIUM_RULE.url,
          note:
            'A policy is written for the full insurable value — in a sale, the price.' +
            FLOOR_NOTES[input.valueBasis] +
            (input.reissue ? ` ${reissueExcessNote(coverage, prior)}` : ''),
        },
        ownerPolicy,
      ),
    );
    if (countsForReader(ownerPolicy)) alternate += otherRate(coverage);

    if (loan > 0) {
      // The owner's policy on this closing will be written at the price, and
      // the appraiser's value is only standing in for it. A loan above that
      // value says nothing about whether the loan is above the price, so no
      // excess is rated off the stand-in: the charge is priced as if the owner's
      // policy covers the loan, and the line says what would change that.
      const lender = lenderPolicyCharge(loan, Math.max(coverage, loan));
      premiumLines.push(
        allocate(
          {
            label: 'Lender’s policy, issued at the same time',
            value: lender,
            cite: SET_BY,
            note:
              loan > coverage
                ? `${LENDER_POLICY_NOTE} The loan is above the appraiser’s value, but the owner’s policy will be written at the price, so no excess coverage is rated here. If the loan is larger than the price, the part above it is rated at the original schedule on top.`
                : LENDER_POLICY_NOTE,
          },
          BORROWER_ONLY,
        ),
      );
      if (countsForReader(BORROWER_ONLY)) alternate += lender;
    }
  }

  if (!isPurchase && loan > 0) {
    premiumLines.push(
      allocate(
        {
          label: `Lender’s policy, ${input.reissue ? 'reissue rate' : 'original rate'}`,
          value: ownerRate(loan),
          cite: rateCite,
          sourceUrl: PREMIUM_RULE.url,
          note:
            'A refinance is rated on the loan, not on the value of the property, so the assessed ' +
            'value does not enter into it. It has no owner’s policy alongside, so it is rated on ' +
            'the schedule rather than charged as an addition to one.' +
            (input.reissue ? ` ${reissueExcessNote(loan, prior)}` : ''),
        },
        BORROWER_ONLY,
      ),
    );
    alternate += otherRate(loan);
  }

  const taxLines: EstimateLine[] = [];

  if (isPurchase) {
    const deed = deedStampTax(countySlug);
    taxLines.push(
      allocate(
        {
          label: deed.label,
          value: deedStampTaxDue(coverage, countySlug),
          cite: deed.cite,
          sourceUrl: deed.sourceUrl,
          // deed.note is what makes this the one line on the page that a county
          // changes, so it is carried through rather than replaced.
          note: deed.note ? `${deed.note} ${STAND_IN_NOTE}` : STAND_IN_NOTE,
        },
        DEED_TAX,
      ),
    );

    const surtax = discretionarySurtax(countySlug);
    if (surtax && !input.singleFamilyResidence) {
      taxLines.push(
        allocate(
          {
            label: surtax.label,
            value: discretionarySurtaxDue(coverage, countySlug),
            cite: surtax.cite,
            sourceUrl: surtax.sourceUrl,
            note: `Charged because what is being conveyed is not a single-family residence. ${STAND_IN_NOTE}`,
          },
          DEED_TAX,
        ),
      );
    }
  }

  if (loan > 0) {
    // The two charges on the loan are the certain ones here: the loan amount is
    // the loan amount, so no value is standing in for anything.
    taxLines.push(
      allocate(
        {
          label: 'Documentary stamp tax on the mortgage',
          value: mortgageStampTaxDue(loan),
          cite: 'Fla. Stat. § 201.08(1)(b)',
          sourceUrl: DOR_DOC_STAMP_GUIDANCE,
          note: isPurchase
            ? 'Charged on the loan, so this one does not depend on the value at all.'
            : RENEWAL_NOTES.mortgageStamps,
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
          note: isPurchase ? undefined : RENEWAL_NOTES.intangible,
        },
        BORROWER_ONLY,
      ),
    );
  }

  const recordingLines: EstimateLine[] = [];
  const recordingCite = 'Fla. Stat. § 28.24(13)';
  const recordingUrl =
    'https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0000-0099/0028/Sections/0028.24.html';

  if (isPurchase) {
    recordingLines.push(
      allocate(
        {
          label: `Recording the deed, ${DEED_PAGES} pages`,
          value: recordingChargeDue(DEED_PAGES),
          cite: recordingCite,
          sourceUrl: recordingUrl,
          note: 'Assumes a deed of the usual length; the charge is $8.50 a page after the first.',
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

  if (loan > 0) {
    recordingLines.push(
      allocate(
        {
          label: `Recording the mortgage, ${MORTGAGE_PAGES} pages`,
          value: recordingChargeDue(MORTGAGE_PAGES),
          cite: recordingCite,
          sourceUrl: recordingUrl,
          note: 'A mortgage runs longer than a deed, and lenders differ on how much longer.',
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
    // A refinance transfers nothing; its taxes are on the loan.
    { title: isPurchase ? 'Tax on the transfer' : 'Taxes', lines: taxLines },
    { title: 'Recording', lines: recordingLines },
  ];

  const mine = (lines: EstimateLine[]) => lines.filter((line) => payableBy(line.payer, party));
  const other: Party = party === 'buyer' ? 'seller' : 'buyer';

  const groups: EstimateGroup[] = all
    .map(({ title, lines }) => {
      const kept = mine(lines);
      return { title, lines: kept, subtotal: sum(kept) };
    })
    .filter((group) => group.lines.length > 0);

  const myPremiumLines = mine(premiumLines);

  return {
    groups,
    premiumTotal: sum(myPremiumLines),
    total: toCents(groups.reduce((running, group) => running + group.subtotal, 0)),
    alternateRateTotal: myPremiumLines.length > 0 ? toCents(alternate) : null,
    otherPartyTotal: isPurchase
      ? sum(all.flatMap(({ lines }) => lines.filter((line) => line.payer === other)))
      : 0,
    ownerPolicyUnassigned:
      isPurchase && all.some(({ lines }) => lines.some((line) => line.payer === 'either')),
  };
}

/** Named so a page can say which rate the comparison figure is at. */
export function otherRateLabel(reissue: boolean): string {
  return reissue ? 'original rate' : 'reissue rate';
}

/** What an assessed-value estimate cannot tell you, printed rather than omitted. */
export const ASSESSED_UNKNOWNS = [
  'The policy is written at the purchase price or full insurable value, not at the value on the county roll — on most Florida homes the roll’s figure is the lower of the two.',
  'Documentary stamp tax and the surtax are charged on the consideration. Until there is a contract price, the figures above compute them on the appraiser’s value instead, which is the same substitution and the same direction of error.',
  'Which side pays for the owner’s policy and the deed tax is the contract’s to settle. The split shown is ordinary Florida practice, and it is only the starting point.',
  'Our settlement or closing fee, and the title search and examination.',
  'Endorsements the lender asks for, survey, municipal lien search, estoppel letters and association fees.',
];
