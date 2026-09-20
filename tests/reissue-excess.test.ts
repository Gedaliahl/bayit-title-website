/**
 * R. 69O-186.003(2)(c): "Any amount of new insurance, in the aggregate, in
 * excess of the amount under the previous policy shall be computed at the
 * original owner's or leasehold rates, as provided in subsection (1)."
 *
 * Before this was modelled the calculator rated the whole liability at the
 * reissue schedule, which under-quoted every reissue on a property worth more
 * than it was last insured for — the common case, and $400 on the example
 * below. These pin the two layers so it cannot drift back.
 */
import { describe, expect, it } from 'vitest';

import { estimate, DEFAULTS } from '@/lib/closing-estimate';
import { originalPremium, reissuePremium } from '@/lib/promulgated-premium';

describe('the reissue rate stops at the old policy amount', () => {
  it('rates the excess at the original schedule, in the aggregate', () => {
    // $500,000 over a $300,000 policy: reissue to 300k, original on the band
    // from 300k to 500k. 100@3.30 + 200@3.00 = 930, then 200@5.00 = 1,000.
    expect(reissuePremium(500_000, 300_000)).toBe(1_930);
  });

  it('is the whole reissue schedule where the new policy is no larger', () => {
    expect(reissuePremium(300_000, 300_000)).toBe(reissuePremium(300_000));
    expect(reissuePremium(250_000, 300_000)).toBe(reissuePremium(250_000));
  });

  it('never charges more than the original rate it is a discount on', () => {
    for (const [liability, prior] of [
      [500_000, 300_000],
      [1_200_000, 400_000],
      [750_000, 749_000],
      [6_000_000, 1_000_000],
    ]) {
      expect(reissuePremium(liability, prior)).toBeLessThanOrEqual(originalPremium(liability));
      expect(reissuePremium(liability, prior)).toBeGreaterThanOrEqual(reissuePremium(liability));
    }
  });

  it('treats an unknown prior policy as the whole liability at reissue', () => {
    expect(reissuePremium(500_000, 0)).toBe(reissuePremium(500_000));
  });

  it('holds the $100 minimum across the split', () => {
    expect(reissuePremium(1_000, 500)).toBe(100);
  });

  it('reaches the estimate, and says which layer is which', () => {
    const priced = estimate({
      ...DEFAULTS,
      price: 500_000,
      loanAmount: 0,
      reissue: true,
      priorPolicyAmount: 300_000,
    });

    const owner = priced.groups
      .flatMap((group) => group.lines)
      .find((line) => line.label.startsWith('Owner’s policy'));

    expect(owner?.value).toBe(1_930);
    expect(owner?.note).toContain('$300,000');
    expect(owner?.note).toContain('original rate');
  });

  it('says so when nobody has entered the old policy amount', () => {
    const priced = estimate({ ...DEFAULTS, price: 500_000, loanAmount: 0, reissue: true });

    const owner = priced.groups
      .flatMap((group) => group.lines)
      .find((line) => line.label.startsWith('Owner’s policy'));

    expect(owner?.value).toBe(1_530);
    expect(owner?.note).toContain('has not been entered');
  });
});
