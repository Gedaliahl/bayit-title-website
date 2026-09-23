/**
 * The doc stamp calculator arranges lib/statutory-rates.ts; it must not do
 * arithmetic of its own. Each figure here is checked against the function the
 * estimate page uses, and against the statute's rate worked by hand.
 */
import { describe, expect, it } from 'vitest';

import { docStampGroups, docStampTotal } from '@/lib/doc-stamps';
import { deedStampTaxDue, intangibleTaxDue, mortgageStampTaxDue } from '@/lib/statutory-rates';

describe('the doc stamp calculator', () => {
  it('taxes a Broward deed at 70¢ per $100 and a $400,000 mortgage at 35¢ plus 2 mills', () => {
    const groups = docStampGroups({
      price: 500_000,
      loanAmount: 400_000,
      countySlug: 'broward-county',
      singleFamilyResidence: true,
    });

    expect(groups.map((group) => group.title)).toEqual(['On the deed', 'On the mortgage']);
    expect(groups[0].lines[0].value).toBe(3_500);
    expect(groups[1].lines.map((line) => line.value)).toEqual([1_400, 800]);
    expect(docStampTotal(groups)).toBe(5_700);
  });

  it('adds the Miami-Dade surtax only where the property is not a single-family residence', () => {
    const base = { price: 500_000, loanAmount: 0, countySlug: 'miami-dade-county' };
    const house = docStampGroups({ ...base, singleFamilyResidence: true });
    const condoBuilding = docStampGroups({ ...base, singleFamilyResidence: false });

    expect(house[0].lines.map((line) => line.value)).toEqual([3_000]);
    expect(condoBuilding[0].lines.map((line) => line.value)).toEqual([3_000, 2_250]);
  });

  it('rounds each part of $100 up, as the statute does', () => {
    const [deed] = docStampGroups({
      price: 500_050,
      loanAmount: 0,
      countySlug: 'broward-county',
      singleFamilyResidence: true,
    });
    expect(deed.lines[0].value).toBe(deedStampTaxDue(500_050, 'broward-county'));
    expect(deed.lines[0].value).toBe(3_500.7);
  });

  it('agrees with the estimate page’s own functions at any price', () => {
    for (const amount of [1, 99, 100, 101, 250_000, 1_234_567]) {
      const groups = docStampGroups({
        price: amount,
        loanAmount: amount,
        countySlug: 'orange-county',
        singleFamilyResidence: true,
      });
      expect(groups[0].lines[0].value).toBe(deedStampTaxDue(amount, 'orange-county'));
      expect(groups[1].lines[0].value).toBe(mortgageStampTaxDue(amount));
      expect(groups[1].lines[1].value).toBe(intangibleTaxDue(amount));
    }
  });

  it('prints nothing for a price of nothing, and no mortgage lines for a cash sale', () => {
    expect(docStampGroups({ price: 0, loanAmount: 0, countySlug: 'broward-county', singleFamilyResidence: true })).toEqual([]);
    const cash = docStampGroups({ price: 300_000, loanAmount: 0, countySlug: 'broward-county', singleFamilyResidence: true });
    expect(cash.map((group) => group.title)).toEqual(['On the deed']);
  });
});
