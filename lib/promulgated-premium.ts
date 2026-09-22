// The promulgated title insurance premium, read from the rule that promulgates
// it: Fla. Admin. Code R. 69O-186.003, adopted by the Office of Insurance
// Regulation under the authority of Fla. Stat. § 627.782.
//
// "Promulgated" is the whole point of this file. The premium is not a Bayit
// Title price and not a quote — it is the same number at every title agency in
// Florida for the same coverage, and an agency that appears to beat it is
// discounting something else. So the schedule is published rather than hidden
// behind a quote form, and every bracket is cited.
//
// Read from the rule text on CHECKED_ON. The rule was last amended 27 January
// 2002; check the History note before assuming these are still current.

import type { CitedFigure } from './cited-figures';
import { formatMoney } from './statutory-rates';

export const CHECKED_ON = '2026-09-14';

export const PREMIUM_RULE = {
  cite: 'Fla. Admin. Code R. 69O-186.003',
  url: 'https://flrules.org/gateway/ruleno.asp?id=69O-186.003',
  /** The statute under which OIR sets the rate. */
  authorityCite: 'Fla. Stat. § 627.782',
  authorityUrl:
    'https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0600-0699/0627/Sections/0627.782.html',
  lastAmended: '2002-01-27',
} as const;

interface Bracket {
  /** Top of the bracket, or null for the open-ended top bracket. */
  upTo: number | null;
  perThousand: number;
}

/** R. 69O-186.003(1)(a)1.a. — owner and leasehold. (1)(b) is the same schedule. */
const ORIGINAL: Bracket[] = [
  { upTo: 100_000, perThousand: 5.75 },
  { upTo: 1_000_000, perThousand: 5.0 },
  { upTo: 5_000_000, perThousand: 2.5 },
  { upTo: 10_000_000, perThousand: 2.25 },
  { upTo: null, perThousand: 2.0 },
];

/** R. 69O-186.003(2)(a)1. — fewer brackets than the original schedule. */
const REISSUE: Bracket[] = [
  { upTo: 100_000, perThousand: 3.3 },
  { upTo: 1_000_000, perThousand: 3.0 },
  { upTo: 10_000_000, perThousand: 2.0 },
  { upTo: null, perThousand: 1.5 },
];

/** R. 69O-186.003(1)(a)1.b. — every conveyance but a multiple conveyance. */
export const MINIMUM_PREMIUM = 100;

/** R. 69O-186.003(5)(a) — the loan policy issued alongside an owner's policy. */
export const SIMULTANEOUS_LOAN_PREMIUM = 25;

/** R. 69O-186.003(3)(c) — floor under the new home purchase discount. */
export const NEW_HOME_MINIMUM_PREMIUM = 200;

const toCents = (value: number) => Math.round(value * 100) / 100;

/**
 * The rule's own arithmetic, from the paragraph above subsection (1): compute
 * on a fractional thousand by multiplying it by the applicable rate per
 * thousand, "considering any fraction of $100.00 as a full $100.00". So the
 * liability rounds up to the next $100 first, and only then is divided into
 * thousands — which is why a $499,950 purchase and a $500,000 one pay the same.
 */
function premium(liability: number, brackets: Bracket[], minimum = MINIMUM_PREMIUM): number {
  if (liability <= 0) return 0;

  const insured = Math.ceil(liability / 100) * 100;

  let remaining = insured;
  let floor = 0;
  let due = 0;

  for (const bracket of brackets) {
    if (remaining <= 0) break;
    const span = bracket.upTo === null ? remaining : Math.min(remaining, bracket.upTo - floor);
    due += (span / 1000) * bracket.perThousand;
    remaining -= span;
    floor = bracket.upTo ?? floor;
  }

  return Math.max(minimum, toCents(due));
}

/** What an owner's policy costs at this purchase price. */
export function originalPremium(liability: number): number {
  return premium(liability, ORIGINAL);
}

/**
 * What it costs where the rule's reissue conditions are met, in two layers.
 *
 * R. 69O-186.003(2)(c): "Any amount of new insurance, in the aggregate, in
 * excess of the amount under the previous policy shall be computed at the
 * original owner's or leasehold rates, as provided in subsection (1)." So the
 * reissue schedule reaches only as far as the old policy did, and the rest is
 * charged at the original schedule.
 *
 * "In the aggregate" decides where the excess sits in the schedule. It is rated
 * where it falls once the whole liability is considered, rather than as a fresh
 * policy starting again at the first bracket: on a $500,000 sale over a $300,000
 * policy that is the $300,000-to-$500,000 band at $5.00 per thousand, not
 * $100,000 at $5.75 plus $100,000 at $5.00. The two readings differ by $75 there.
 * Compare (5)(a), which says "the amount ... in excess" without "in the
 * aggregate" and is rated the other way in simultaneousLoanPremium — the
 * difference in wording is the reason they are computed differently.
 *
 * Confirmed by the team on 20 September 2026: the excess is rated at its
 * position in the aggregate schedule, which is what this function does.
 *
 * priorPolicyAmount of 0 means nobody has told us, in which case the whole
 * liability goes at the reissue schedule and the caller says so on the line.
 */
export function reissuePremium(liability: number, priorPolicyAmount = 0): number {
  if (liability <= 0) return 0;

  const prior = Math.max(0, priorPolicyAmount);
  if (prior <= 0 || liability <= prior) return premium(liability, REISSUE);

  const upToPrior = premium(prior, REISSUE, 0);
  const excess = premium(liability, ORIGINAL, 0) - premium(prior, ORIGINAL, 0);

  return Math.max(MINIMUM_PREMIUM, toCents(upToPrior + excess));
}

/** Said on a reissue line where nobody has told us what the old policy insured. */
export const REISSUE_EXCESS_UNKNOWN =
  'Rated here on the whole amount, because the previous policy amount has not been entered. ' +
  'Under R. 69O-186.003(2)(c) anything above that amount belongs at the original schedule, so ' +
  'on a property worth more now than when it was last insured the real figure is higher.';

/** What a reissue line should say about how it was split. */
export function reissueExcessNote(liability: number, priorPolicyAmount: number): string {
  if (priorPolicyAmount <= 0) return REISSUE_EXCESS_UNKNOWN;

  if (liability <= priorPolicyAmount) {
    return `All of it sits inside the ${formatMoney(priorPolicyAmount)} the previous policy insured, so all of it is at the reissue rate.`;
  }

  return `The first ${formatMoney(priorPolicyAmount)} is at the reissue rate. R. 69O-186.003(2)(c) puts the ${formatMoney(liability - priorPolicyAmount)} above the previous policy at the original rate.`;
}

function schedule(brackets: Bracket[], cite: string, sourceUrl: string): CitedFigure[] {
  return brackets.map((bracket, index) => {
    const floor = index === 0 ? 0 : (brackets[index - 1].upTo as number);

    const label =
      index === 0
        ? `First ${formatMoney(bracket.upTo as number)} of liability`
        : bracket.upTo === null
          ? `Over ${formatMoney(floor)}`
          : `${formatMoney(floor)} to ${formatMoney(bracket.upTo)}`;

    return {
      label,
      // Always two decimals: a rate written as "$5" reads like a typo next to "$5.75".
      amount: `$${bracket.perThousand.toFixed(2)} per $1,000`,
      cite,
      sourceUrl,
    };
  });
}

export const ORIGINAL_SCHEDULE = schedule(ORIGINAL, `${PREMIUM_RULE.cite}(1)(a)`, PREMIUM_RULE.url);

export const REISSUE_SCHEDULE = schedule(REISSUE, `${PREMIUM_RULE.cite}(2)(a)`, PREMIUM_RULE.url);

/**
 * R. 69O-186.003(5)(a). The loan policy issued alongside an owner's policy on
 * the same land is $25 up to the owner's amount; "the risk premium on the
 * amount of the mortgage policy or policies in excess of the owner's policy
 * shall be figured at the regular original title insurance rates for mortgage
 * policies", so the excess alone is rated, and the $100 policy minimum is not
 * applied a second time to it.
 */
export function simultaneousLoanPremium(loanAmount: number, ownerCoverage: number): number {
  if (loanAmount <= 0) return 0;
  if (loanAmount <= ownerCoverage) return SIMULTANEOUS_LOAN_PREMIUM;

  return toCents(SIMULTANEOUS_LOAN_PREMIUM + excessLoanPremium(loanAmount - ownerCoverage));
}

/**
 * The original schedule applied to the excess alone, under the same paragraph.
 *
 * Exported because what a lender's policy is issued for is this office's charge
 * rather than the rule's (see lib/agency-charges.ts), while the coverage above
 * the owner's amount stays the rule's to rate. The $100 policy minimum is not
 * applied: the excess is not itself a policy, it is the part of one.
 */
export function excessLoanPremium(excessCoverage: number): number {
  if (excessCoverage <= 0) return 0;
  return premium(excessCoverage, ORIGINAL, 0);
}
