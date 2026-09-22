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

import { excessLoanPremium } from './promulgated-premium';
import { site } from './site';

/** Printed where the other lines print a statute or a rule, so the difference shows. */
export const SET_BY = site.name;

/**
 * The lender's policy issued alongside the owner's policy on the same land.
 *
 * R. 69O-186.003(5)(a) puts the promulgated risk premium for that policy at
 * SIMULTANEOUS_LOAN_PREMIUM — $25 — and that figure is still what the rule says
 * and still what the county and city pages cite it for. What this office
 * charges to issue the policy is this, and it is the figure a reader will see
 * on their own statement, so it is the figure the estimate prints.
 */
export const LENDER_POLICY_CHARGE = 125;

/** Per document sent to the clerk electronically, passed through as charged. */
export const E_RECORDING_FEE = 5.5;

export const LENDER_POLICY_NOTE =
  'What we charge to issue the lender’s policy alongside the owner’s on the same land. Not ' +
  'promulgated: R. 69O-186.003(5)(a) sets the risk premium inside it, not what it is issued for.';

export const E_RECORDING_NOTE =
  '$5.50 a document, passed through at cost — on top of the clerk’s per-page charge under ' +
  's. 28.24(13), not instead of it.';

const toCents = (value: number) => Math.round(value * 100) / 100;

/**
 * What the lender's policy adds, including any coverage above the owner's.
 *
 * The flat charge covers the policy up to the owner's amount. Above that there
 * is real extra liability, and R. 69O-186.003(5)(a) rates "the amount of the
 * mortgage policy or policies in excess of the owner's policy" at the original
 * schedule — so the excess is still promulgated premium and is still computed
 * by the rule, on top of what we charge for the policy itself.
 */
export function lenderPolicyCharge(loanAmount: number, ownerCoverage: number): number {
  if (loanAmount <= 0) return 0;
  if (loanAmount <= ownerCoverage) return LENDER_POLICY_CHARGE;

  return toCents(LENDER_POLICY_CHARGE + excessLoanPremium(loanAmount - ownerCoverage));
}

/** $5.50 a document, so a deed and a mortgage together are $11.00. */
export function eRecordingDue(documents: number): number {
  return toCents(Math.max(0, documents) * E_RECORDING_FEE);
}
