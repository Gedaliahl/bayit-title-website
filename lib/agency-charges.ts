// The figures on the estimate that this office sets, rather than the rule or
// the statute.
//
// Everything else the estimators print can be checked against a published
// authority: the premium against R. 69O-186.003, the taxes against ch. 201 and
// ch. 199, the recording charge against s. 28.24(13). These two cannot be, and
// keeping them in their own file is how the boundary stays visible — a figure
// that moves into here has stopped being checkable and has to say so on the
// line it prints on, which is what SET_BY below is for.
//
// They are still on the estimate rather than in UNPRICED because a reader is
// quoted them on every file: adding a lender's policy costs what it costs, and
// a document that is e-recorded carries the e-recording charge. Leaving them
// out would make the total read low by a known amount, which is the one kind of
// wrong this page exists to avoid.

import { SIMULTANEOUS_LOAN_PREMIUM, excessLoanPremium } from './promulgated-premium';
import { site } from './site';
import { formatMoney } from './statutory-rates';

/** Printed where the other lines print a statute or a rule, so the difference shows. */
export const SET_BY = site.name;

/**
 * The lender's policy issued alongside the owner's policy on the same land.
 *
 * R. 69O-186.003(5)(a) sets SIMULTANEOUS_LOAN_PREMIUM — $25 — as the least that
 * policy can be. It sets no price and no maximum. This is what the office
 * charges to issue it, the figure a reader will see on their own statement,
 * so it is the figure the estimate prints.
 */
export const LENDER_POLICY_CHARGE = 125;

/** Per document sent to the clerk electronically, passed through as charged. */
export const E_RECORDING_FEE = 5.5;

export const LENDER_POLICY_NOTE =
  'What we charge to issue the lender’s policy alongside the owner’s on the same land. ' +
  `R. 69O-186.003(5)(a) sets ${formatMoney(SIMULTANEOUS_LOAN_PREMIUM)} as the least it can be, not its price.`;

export const E_RECORDING_NOTE =
  '$5.50 a document, passed through at cost — on top of the clerk’s per-page charge under ' +
  's. 28.24(13), not instead of it.';

/**
 * Said wherever a page cites the rule's $25 for a simultaneous lender's policy.
 *
 * The county, city and buyer pages are describing R. 69O-186.003(5)(a), and a
 * reader who carried that $25 to the estimate page would find $125 there with
 * nothing to account for the gap. The sentence lives here rather than in each
 * of those pages so that the three cannot drift from each other or from the
 * charge.
 */
export const LENDER_POLICY_BESIDE_RULE =
  `That ${formatMoney(SIMULTANEOUS_LOAN_PREMIUM)} is a minimum, not a price: ${site.name} charges ` +
  `${formatMoney(LENDER_POLICY_CHARGE)} to issue the policy alongside the owner’s, and that is the ` +
  'figure the estimate prints. Where the loan is larger than the owner’s amount, the coverage above ' +
  'it adds the difference between the original rate at the loan amount and at the owner’s amount.';

const toCents = (value: number) => Math.round(value * 100) / 100;

/**
 * What the lender's policy adds, including any coverage above the owner's.
 *
 * The flat charge covers the policy up to the owner's amount. Above that there
 * is real extra liability, which R. 69O-186.003(5)(a) rates at the original
 * schedule, layered on the owner's amount (see excessLoanPremium), on top of
 * what we charge for the policy itself.
 */
export function lenderPolicyCharge(loanAmount: number, ownerCoverage: number): number {
  if (loanAmount <= 0) return 0;
  return toCents(LENDER_POLICY_CHARGE + excessLoanPremium(loanAmount, ownerCoverage));
}

/** $5.50 a document, so a deed and a mortgage together are $11.00. */
export function eRecordingDue(documents: number): number {
  return toCents(Math.max(0, documents) * E_RECORDING_FEE);
}
