/**
 * The estimator's figures as fixed numbers.
 *
 * The other estimate tests are relational — the owner's line equals
 * originalPremium(price), the seller's total equals the buyer's other-party
 * figure — so a wrong rate constant would pass every one of them. These are
 * worked by hand from the rule and the statutes instead:
 *
 *   R. 69O-186.003(1)(a): $5.75, $5.00, $2.50, $2.25, $2.00 per $1,000, the
 *     liability rounded up to the next $100, $100 minimum.
 *   R. 69O-186.003(2)(a): reissue at $3.30, $3.00, $2.00, $1.50.
 *   § 201.02(1)(a): 70¢ per $100 or part; 60¢ in Miami-Dade (§ 201.0205),
 *     plus the 45¢ surtax there except on a single-family residence (§ 201.031).
 *   § 201.08(1)(b): 35¢ per $100 or part of the amount secured.
 *   § 199.133(1): 2 mills on the dollar.
 *   § 28.24(13): $10.00 for the first page, $8.50 for each after it.
 */
import { describe, expect, it } from 'vitest';

import { LENDER_POLICY_CHARGE, lenderPolicyCharge } from '@/lib/agency-charges';
import { ASSESSED_DEFAULTS, estimateFromAssessedValue } from '@/lib/assessed-estimate';
import { DEFAULTS, EXAMPLE_PAGE_COUNTS, estimate, type Estimate } from '@/lib/closing-estimate';
import { originalPremium, reissuePremium } from '@/lib/promulgated-premium';
import {
  deedStampTaxDue,
  discretionarySurtaxDue,
  formatCents,
  formatMoney,
  intangibleTaxDue,
  mortgageStampTaxDue,
  recordingChargeDue,
} from '@/lib/statutory-rates';

const lines = (result: Pick<Estimate, 'groups'>) => result.groups.flatMap((group) => group.lines);
const line = (result: Pick<Estimate, 'groups'>, starts: string) =>
  lines(result).find((candidate) => candidate.label.startsWith(starts));

describe('the original schedule, at every bracket boundary', () => {
  it.each([
    // $1 rounds up to $100 of liability: 58¢, so the minimum.
    [1, 100],
    // 17.3 × 5.75 = 99.475: still under the minimum.
    [17_300, 100],
    // Rounds up to $17,400: 17.4 × 5.75 = 100.05, the first figure over it.
    [17_391, 100.05],
    [100_000, 575],
    // Rounds up to $100,100: the extra $100 at $5.00.
    [100_001, 575.5],
    [500_000, 2_575],
    [1_000_000, 5_075],
    // Rounds up to $1,000,100: the extra $100 at $2.50.
    [1_000_001, 5_075.25],
    [5_000_000, 15_075],
    [10_000_000, 26_325],
    // 26,325 + 15,000 × 2.00.
    [25_000_000, 56_325],
  ])('%i of liability is $%d', (liability, premium) => {
    expect(originalPremium(liability)).toBe(premium);
  });
});

describe('the reissue schedule', () => {
  it.each([
    [1, 100],
    // 30.3 × 3.30 = 99.99.
    [30_300, 100],
    [100_000, 330],
    [500_000, 1_530],
    [1_000_000, 3_030],
    [5_000_000, 11_030],
    [10_000_000, 21_030],
    [25_000_000, 43_530],
  ])('%i of liability is $%d where nobody has given the old amount', (liability, premium) => {
    expect(reissuePremium(liability)).toBe(premium);
  });
});

describe('the taxes and the recording charge', () => {
  it('taxes the deed at 70¢ per $100 or part of one', () => {
    expect(deedStampTaxDue(500_000, 'broward-county')).toBe(3_500);
    expect(deedStampTaxDue(500_050, 'broward-county')).toBe(3_500.7);
    expect(deedStampTaxDue(1, 'broward-county')).toBe(0.7);
  });

  it('taxes it at 60¢ in Miami-Dade, with the 45¢ surtax only on other than a single-family home', () => {
    expect(deedStampTaxDue(500_000, 'miami-dade-county')).toBe(3_000);
    expect(discretionarySurtaxDue(500_000, 'miami-dade-county')).toBe(2_250);
    expect(discretionarySurtaxDue(500_000, 'broward-county')).toBe(0);

    const dade = { ...DEFAULTS, countySlug: 'miami-dade-county', party: 'seller' as const };
    expect(line(estimate(dade), 'County discretionary surtax')).toBeUndefined();
    expect(line(estimate({ ...dade, singleFamilyResidence: false }), 'County discretionary surtax')?.value).toBe(2_250);
  });

  it('taxes the mortgage at 35¢ per $100 or part, and the loan at 2 mills', () => {
    expect(mortgageStampTaxDue(400_000)).toBe(1_400);
    expect(mortgageStampTaxDue(400_001)).toBe(1_400.35);
    expect(intangibleTaxDue(400_000)).toBe(800);
    expect(intangibleTaxDue(123_457)).toBe(246.91);
  });

  it('records at $10.00 for the first page and $8.50 for each after it', () => {
    expect(recordingChargeDue(1)).toBe(10);
    expect(recordingChargeDue(3)).toBe(27);
    expect(recordingChargeDue(25)).toBe(214);
  });
});

describe('a whole estimate', () => {
  // $500,000 purchase, $400,000 loan, Broward, custom unverified, 3 and 25 pages.
  it('prices the buyer’s side of a purchase', () => {
    const buyer = estimate(DEFAULTS);

    // 2,575 + 125 in premium; 1,400 + 800 in loan taxes; 27 + 5.50 + 214 + 5.50 recording.
    expect(buyer.groups.map((group) => group.subtotal)).toEqual([2_700, 2_200, 252]);
    expect(buyer.total).toBe(5_152);
  });

  it('prices the seller’s side of the same purchase', () => {
    const seller = estimate({ ...DEFAULTS, party: 'seller' });

    // The owner's policy (shown to both, the custom being unverified) and the deed tax.
    expect(seller.total).toBe(6_075);
  });

  it('prices a refinance on the loan alone', () => {
    const refinance = estimate({ ...DEFAULTS, transaction: 'refinance' });

    // 400k at the original schedule: 575 + 300 × 5.00 = 2,075. Then 1,400 + 800,
    // then 214 + 5.50 for the mortgage.
    expect(refinance.groups.map((group) => group.subtotal)).toEqual([2_075, 2_200, 219.5]);
    expect(refinance.total).toBe(4_494.5);
  });

  it('puts the page counts the site’s examples use into the defaults', () => {
    expect(DEFAULTS.deedPages).toBe(EXAMPLE_PAGE_COUNTS.deed);
    expect(DEFAULTS.mortgagePages).toBe(EXAMPLE_PAGE_COUNTS.mortgage);
  });
});

/**
 * Pinned as it stands, not as settled. D1 (whether $125 is right on a line
 * the rule prices at $25) and D2 (how a loan above the owner's amount is
 * rated) are with the underwriter; when either is answered these change on
 * purpose, and this is where the change will show.
 */
describe('current behaviour pending D1 and D2', () => {
  it('charges $125 for the lender’s policy up to the owner’s amount (D1)', () => {
    expect(LENDER_POLICY_CHARGE).toBe(125);
    expect(lenderPolicyCharge(400_000, 500_000)).toBe(125);
  });

  it('rates the loan excess from the first bracket of the original schedule (D2)', () => {
    // $500,000 of excess: 575 + 400 × 5.00 = 2,575, plus the 125.
    expect(lenderPolicyCharge(1_500_000, 1_000_000)).toBe(2_700);
  });
});

describe('what the other side carries', () => {
  it('leaves an owner’s policy shown to both sides out of the other side’s figure', () => {
    // Unverified custom: the $2,575 is already in the buyer's own total.
    const buyer = estimate(DEFAULTS);
    expect(buyer.otherPartyTotal).toBe(3_500);
    expect(buyer.ownerPolicyUnassigned).toBe(true);

    const seller = estimate({ ...DEFAULTS, party: 'seller' });
    expect(seller.otherPartyTotal).toBe(5_152 - 2_575);
  });

  it('counts it on the side custom puts it on, where the custom is known', () => {
    const seller = estimate({ ...DEFAULTS, ownerPolicyCustom: 'buyer', party: 'seller' });
    expect(seller.otherPartyTotal).toBe(5_152);
    expect(seller.ownerPolicyUnassigned).toBe(false);
  });

  it('does the same from an assessed value', () => {
    const buyer = estimateFromAssessedValue({
      ...ASSESSED_DEFAULTS,
      assessedValue: 500_000,
      loanAmount: 400_000,
    });
    expect(buyer.otherPartyTotal).toBe(3_500);
    expect(buyer.ownerPolicyUnassigned).toBe(true);
  });
});

describe('a purchase with no price yet', () => {
  it('prices nothing rather than the loan alone', () => {
    const result = estimate({ ...DEFAULTS, price: 0 });
    expect(result.groups).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.otherPartyTotal).toBe(0);
  });

  it('does the same from an address with no value', () => {
    const result = estimateFromAssessedValue({ ...ASSESSED_DEFAULTS, loanAmount: 400_000 });
    expect(result.groups).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('still prices a refinance, which has no price', () => {
    expect(estimate({ ...DEFAULTS, transaction: 'refinance', price: 0 }).total).toBe(4_494.5);
  });
});

describe('the lender’s policy from an assessed value', () => {
  it('rates no excess off a value that is only standing in for the price', () => {
    // Assessed $250,000, loan $400,000. The owner's policy will be written at
    // the price, which nobody has told us, so the loan is not above it by
    // anything we know.
    const result = estimateFromAssessedValue({
      ...ASSESSED_DEFAULTS,
      assessedValue: 250_000,
      loanAmount: 400_000,
    });
    const lender = line(result, 'Lender’s policy');

    expect(lender?.value).toBe(125);
    expect(lender?.note).toMatch(/no excess coverage is rated here/);
  });
});

describe('page counts', () => {
  it('prices an empty box as one page rather than dropping the line', () => {
    const result = estimate({ ...DEFAULTS, deedPages: 0, mortgagePages: 0 });
    expect(line(result, 'Recording the deed')).toMatchObject({ label: 'Recording the deed, 1 page', value: 10 });
    expect(line(result, 'Recording the mortgage')?.value).toBe(10);
  });

  it('stops at 500 pages', () => {
    expect(line(estimate({ ...DEFAULTS, mortgagePages: 10_000 }), 'Recording the mortgage')?.label).toBe(
      'Recording the mortgage, 500 pages',
    );
  });
});

describe('a refinance', () => {
  const refinance = estimate({ ...DEFAULTS, transaction: 'refinance' });

  it('heads its taxes as taxes, since nothing is transferred', () => {
    expect(refinance.groups.map((group) => group.title)).toContain('Taxes');
    expect(estimate(DEFAULTS).groups.map((group) => group.title)).toContain('Tax on the transfer');
  });

  it('says on each loan tax what a renewal would change, and cites the section', () => {
    expect(line(refinance, 'Documentary stamp tax on the mortgage')?.note).toContain('§ 201.09');
    expect(line(refinance, 'Nonrecurring intangible tax')?.note).toContain('§ 199.145(4)');
    expect(line(estimate(DEFAULTS), 'Nonrecurring intangible tax')?.note).not.toContain('199.145');
  });
});

describe('figures that are not numbers', () => {
  it('never prices NaN or Infinity', () => {
    const result = estimate({ ...DEFAULTS, price: Number.NaN, loanAmount: Number.POSITIVE_INFINITY });
    expect(result.total).toBe(0);

    const assessed = estimateFromAssessedValue({
      ...ASSESSED_DEFAULTS,
      assessedValue: 500_000,
      loanAmount: Number.NaN,
      reissue: true,
      priorPolicyAmount: Number.NaN,
    });
    expect(Number.isFinite(assessed.total)).toBe(true);
    expect(assessed.total).toBeGreaterThan(0);
  });

  it('prints a dash rather than $NaN', () => {
    expect(formatMoney(Number.NaN)).toBe('—');
    expect(formatMoney(Number.POSITIVE_INFINITY)).toBe('—');
    expect(formatCents(Number.NaN)).toBe('—');
  });

  it('prints every figure on the card to the cent', () => {
    expect(formatCents(2_575)).toBe('$2,575.00');
    expect(formatCents(5.5)).toBe('$5.50');
    // formatMoney still reads as a sentence does.
    expect(formatMoney(2_575)).toBe('$2,575');
  });
});
