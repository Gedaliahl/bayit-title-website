/**
 * The two pieces behind /estimate: guessing a county from a typed address, and
 * pricing the promulgated premium off an assessed value.
 *
 * Both are the sort of thing that looks obviously right and is quietly wrong —
 * "Palm Beach Gardens" read as Palm Beach is harmless, "North Miami Beach" read
 * as Miami Beach is the same county by luck rather than by logic, and a
 * refinance priced off an assessed value instead of the loan would be wrong by
 * whatever the gap between the two happens to be.
 */
import { describe, expect, it } from 'vitest';

import { matchCounty } from '@/lib/florida-places';
import {
  ASSESSED_DEFAULTS,
  estimateFromAssessedValue,
  otherRateLabel,
} from '@/lib/assessed-estimate';
import { E_RECORDING_FEE, LENDER_POLICY_CHARGE } from '@/lib/agency-charges';
import { originalPremium, reissuePremium } from '@/lib/promulgated-premium';
import { deedStampTaxDue, discretionarySurtaxDue } from '@/lib/statutory-rates';

describe('guessing the county from an address', () => {
  it('finds the city in a full street address', () => {
    expect(matchCounty('3301 N University Drive, Suite 100, Coral Springs, FL 33065')).toEqual({
      countySlug: 'broward-county',
      place: 'Coral Springs',
    });
  });

  it('prefers the longest place name, so a suffix does not swallow the city', () => {
    // "Palm Beach Gardens" contains "Palm Beach"; both are Palm Beach County,
    // but the reasoning shown to the reader has to name the right place.
    expect(matchCounty('11000 Prosperity Farms Rd, Palm Beach Gardens FL')?.place).toBe(
      'Palm Beach Gardens',
    );
    // "North Miami Beach" contains both "Miami Beach" and "Miami".
    expect(matchCounty('1600 NE 163rd St, North Miami Beach, FL')?.place).toBe(
      'North Miami Beach',
    );
  });

  it('is not confused by punctuation or abbreviation', () => {
    expect(matchCounty('100 SE 3rd Ave., Ft. Lauderdale, FL 33394')?.countySlug).toBe(
      'broward-county',
    );
  });

  it('reads the counties added beyond South Florida', () => {
    expect(matchCounty('601 E Kennedy Blvd, Tampa FL')?.countySlug).toBe('hillsborough-county');
    expect(matchCounty('400 S Orange Ave, Orlando FL')?.countySlug).toBe('orange-county');
    expect(matchCounty('231 E Forsyth St, Jacksonville FL')?.countySlug).toBe('duval-county');
  });

  it('returns nothing rather than guessing at an address it does not recognise', () => {
    expect(matchCounty('123 Main Street, Tallahassee, FL')).toBeNull();
    expect(matchCounty('   ')).toBeNull();
    expect(matchCounty('')).toBeNull();
  });
});

describe('pricing from an assessed value', () => {
  const premiumOf = (result: ReturnType<typeof estimateFromAssessedValue>) =>
    result.groups.find((group) => group.title === 'Title insurance premium');

  it('prices the owner’s policy at the promulgated original rate', () => {
    const result = estimateFromAssessedValue({
      ...ASSESSED_DEFAULTS,
      assessedValue: 500_000,
    });

    expect(result.premiumTotal).toBe(originalPremium(500_000));
    // The alternative offered alongside is the reissue rate on the same cover.
    expect(result.alternateRateTotal).toBe(reissuePremium(500_000));
    expect(otherRateLabel(false)).toBe('reissue rate');
  });

  it('adds the lender’s policy at what we charge to issue it, not at the rule’s $25', () => {
    const result = estimateFromAssessedValue({
      ...ASSESSED_DEFAULTS,
      assessedValue: 500_000,
      loanAmount: 400_000,
    });

    expect(result.premiumTotal).toBe(originalPremium(500_000) + LENDER_POLICY_CHARGE);

    // R. 69O-186.003(5)(a) sets the risk premium inside that charge, not the
    // charge, so the line has to name us rather than cite the rule for it.
    const lender = result.groups
      .flatMap((group) => group.lines)
      .find((line) => line.label.toLowerCase().includes('lender'));

    expect(lender?.value).toBe(LENDER_POLICY_CHARGE);
    expect(lender?.sourceUrl).toBeUndefined();
    expect(lender?.cite).not.toMatch(/69O-186/);
  });

  it('rates a refinance on the loan, never on the assessed value', () => {
    const result = estimateFromAssessedValue({
      ...ASSESSED_DEFAULTS,
      purpose: 'refinance',
      // A figure that would change the answer if it were being used.
      assessedValue: 900_000,
      loanAmount: 300_000,
    });

    expect(result.premiumTotal).toBe(originalPremium(300_000));
    expect(premiumOf(result)?.lines).toHaveLength(1);
  });

  it('leaves the deed out of a refinance, and the deed tax with it', () => {
    const labels = estimateFromAssessedValue({
      ...ASSESSED_DEFAULTS,
      purpose: 'refinance',
      assessedValue: 900_000,
      loanAmount: 300_000,
    })
      .groups.flatMap((group) => group.lines)
      .map((line) => line.label.toLowerCase());

    expect(labels.some((label) => label.includes('deed'))).toBe(false);
    expect(labels.some((label) => label.includes('stamp tax on the mortgage'))).toBe(true);
    expect(labels.some((label) => label.includes('intangible'))).toBe(true);
  });

  it('says nothing at all until it has been given a number', () => {
    const result = estimateFromAssessedValue(ASSESSED_DEFAULTS);

    expect(result.groups).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.premiumTotal).toBe(0);
    expect(result.alternateRateTotal).toBeNull();
  });

  it('treats a negative value as no value rather than as a credit', () => {
    const result = estimateFromAssessedValue({
      ...ASSESSED_DEFAULTS,
      assessedValue: -100_000,
      loanAmount: -5,
    });

    expect(result.groups).toEqual([]);
    expect(result.total).toBe(0);
  });

  /**
   * The taxes are the reason the county selector is on the page at all: the
   * premium schedule is statewide, and a figure that moved with the county
   * would be wrong. What does move with the county is the tax on the deed.
   */
  describe('what the county changes', () => {
    const inputs = { ...ASSESSED_DEFAULTS, assessedValue: 500_000, loanAmount: 400_000 };
    // The tax on the deed is customarily the seller's, so it is the seller's
    // statement these read. See the split described further down.
    const sellerInputs = { ...inputs, party: 'seller' as const };

    it('keeps the premium identical across counties', () => {
      const broward = estimateFromAssessedValue({ ...inputs, countySlug: 'broward-county' });
      const dade = estimateFromAssessedValue({ ...inputs, countySlug: 'miami-dade-county' });

      expect(dade.premiumTotal).toBe(broward.premiumTotal);
    });

    it('charges Miami-Dade’s 60-cent deed rate where the rest of Florida pays 70', () => {
      const broward = estimateFromAssessedValue({ ...sellerInputs, countySlug: 'broward-county' });
      const dade = estimateFromAssessedValue({ ...sellerInputs, countySlug: 'miami-dade-county' });

      const deedTax = (result: ReturnType<typeof estimateFromAssessedValue>) =>
        result.groups
          .flatMap((group) => group.lines)
          .find((line) => line.label.toLowerCase().includes('stamp tax on the deed'))?.value;

      expect(deedTax(broward)).toBe(deedStampTaxDue(500_000, 'broward-county'));
      expect(deedTax(dade)).toBe(deedStampTaxDue(500_000, 'miami-dade-county'));
      expect(deedTax(dade)).toBeLessThan(deedTax(broward) as number);
    });

    it('adds the surtax in Miami-Dade only when it is not a single-family residence', () => {
      const home = estimateFromAssessedValue({ ...sellerInputs, countySlug: 'miami-dade-county' });
      const other = estimateFromAssessedValue({
        ...sellerInputs,
        countySlug: 'miami-dade-county',
        singleFamilyResidence: false,
      });
      const elsewhere = estimateFromAssessedValue({
        ...sellerInputs,
        countySlug: 'broward-county',
        singleFamilyResidence: false,
      });

      const surtax = (result: ReturnType<typeof estimateFromAssessedValue>) =>
        result.groups
          .flatMap((group) => group.lines)
          .find((line) => line.label.toLowerCase().includes('surtax'));

      expect(surtax(home)).toBeUndefined();
      expect(surtax(other)?.value).toBe(discretionarySurtaxDue(500_000, 'miami-dade-county'));
      // The surtax is that one county's to levy; nowhere else charges it.
      expect(surtax(elsewhere)).toBeUndefined();
    });
  });

  /**
   * The taxes are charged on the consideration and there is no consideration on
   * this page — only a valuation figure standing in for one. That substitution
   * is the weakest thing here, so it is asserted rather than trusted: it stays
   * out of the premium subtotal, and it says so on the line.
   */
  it('keeps the taxes away from the premium and admits what they are computed on', () => {
    const result = estimateFromAssessedValue({
      ...ASSESSED_DEFAULTS,
      assessedValue: 500_000,
      loanAmount: 400_000,
    });

    expect(result.premiumTotal).toBe(originalPremium(500_000) + LENDER_POLICY_CHARGE);
    expect(result.total).toBeGreaterThan(result.premiumTotal);

    const premiumLabels = (premiumOf(result)?.lines ?? []).map((line) => line.label.toLowerCase());
    expect(premiumLabels.some((label) => label.includes('stamp'))).toBe(false);
    expect(premiumLabels.some((label) => label.includes('recording'))).toBe(false);

    const deedLine = estimateFromAssessedValue({
      ...ASSESSED_DEFAULTS,
      party: 'seller',
      assessedValue: 500_000,
      loanAmount: 400_000,
    })
      .groups.flatMap((group) => group.lines)
      .find((line) => line.label.toLowerCase().includes('stamp tax on the deed'));

    expect(deedLine?.note).toMatch(/consideration/i);
  });

  /**
   * The reason the estimate is split by party rather than simply totalled.
   *
   * A seller is not borrowing, so a total with the buyer's loan costs inside it
   * was not a figure a seller could use for anything. What is worth asserting
   * is the direction of the error: the lines that have no other side really do
   * not appear on the wrong one, and the two sides between them account for
   * every line exactly once where the custom is known.
   */
  describe('whose side of the table each line lands on', () => {
    const inputs = {
      ...ASSESSED_DEFAULTS,
      countyName: 'Broward County',
      assessedValue: 500_000,
      loanAmount: 400_000,
    };

    const labels = (result: ReturnType<typeof estimateFromAssessedValue>) =>
      result.groups.flatMap((group) => group.lines).map((line) => line.label.toLowerCase());

    it('never puts a loan charge on the seller', () => {
      const seller = labels(estimateFromAssessedValue({ ...inputs, party: 'seller' }));

      for (const loanLine of ['lender', 'mortgage', 'intangible']) {
        expect(seller.some((label) => label.includes(loanLine))).toBe(false);
      }
    });

    it('gives the seller the tax on the deed and the buyer the recording of it', () => {
      const seller = labels(estimateFromAssessedValue({ ...inputs, party: 'seller' }));
      const buyer = labels(estimateFromAssessedValue({ ...inputs, party: 'buyer' }));

      expect(seller.some((label) => label.includes('stamp tax on the deed'))).toBe(true);
      expect(buyer.some((label) => label.includes('stamp tax on the deed'))).toBe(false);

      expect(buyer.some((label) => label.includes('recording the deed'))).toBe(true);
      expect(seller.some((label) => label.includes('recording the deed'))).toBe(false);
    });

    it('follows the county’s own custom on the owner’s policy', () => {
      const buyerCounty = { ...inputs, ownerPolicyCustom: 'buyer' };
      const sellerCounty = { ...inputs, ownerPolicyCustom: 'seller' };
      const owners = (result: ReturnType<typeof estimateFromAssessedValue>) =>
        labels(result).some((label) => label.includes('owner’s policy'));

      expect(owners(estimateFromAssessedValue({ ...buyerCounty, party: 'buyer' }))).toBe(true);
      expect(owners(estimateFromAssessedValue({ ...buyerCounty, party: 'seller' }))).toBe(false);

      expect(owners(estimateFromAssessedValue({ ...sellerCounty, party: 'seller' }))).toBe(true);
      expect(owners(estimateFromAssessedValue({ ...sellerCounty, party: 'buyer' }))).toBe(false);
    });

    it('shows the owner’s policy to both sides where the custom is unverified', () => {
      // 'another Florida county' is sixty-odd counties at once and cannot have
      // one answer, so neither side is told it is theirs.
      const owner = (party: 'buyer' | 'seller') =>
        estimateFromAssessedValue({ ...inputs, ownerPolicyCustom: null, party })
          .groups.flatMap((group) => group.lines)
          .find((line) => line.label.toLowerCase().includes('owner’s policy'));

      expect(owner('buyer')?.value).toBe(originalPremium(500_000));
      expect(owner('seller')?.value).toBe(originalPremium(500_000));
      expect(owner('buyer')?.note).toMatch(/both sides/i);
    });

    it('tells each side what the other is carrying', () => {
      const buyer = estimateFromAssessedValue({
        ...inputs,
        ownerPolicyCustom: 'buyer',
        party: 'buyer',
      });
      const seller = estimateFromAssessedValue({
        ...inputs,
        ownerPolicyCustom: 'buyer',
        party: 'seller',
      });

      expect(buyer.otherPartyTotal).toBe(seller.total);
      expect(seller.otherPartyTotal).toBe(buyer.total);
      expect(seller.total).toBeGreaterThan(0);

      // Where the custom is known there is no line on both sides, so the two
      // statements between them are the closing and not more than it.
      const overlap = labels(buyer).filter((label) => labels(seller).includes(label));
      expect(overlap).toEqual([]);
    });

    it('leaves a refinance whole, whichever way the toggle was left', () => {
      const asBuyer = estimateFromAssessedValue({ ...inputs, purpose: 'refinance', party: 'buyer' });
      const asSeller = estimateFromAssessedValue({
        ...inputs,
        purpose: 'refinance',
        party: 'seller',
      });

      expect(asSeller.total).toBe(asBuyer.total);
      expect(asSeller.total).toBeGreaterThan(0);
      expect(asSeller.otherPartyTotal).toBe(0);
    });
  });

  it('charges the e-recording fee once for each document it sends', () => {
    const purchase = estimateFromAssessedValue({
      ...ASSESSED_DEFAULTS,
      assessedValue: 500_000,
      loanAmount: 400_000,
    });
    const cash = estimateFromAssessedValue({ ...ASSESSED_DEFAULTS, assessedValue: 500_000 });

    const eRecording = (result: ReturnType<typeof estimateFromAssessedValue>) =>
      result.groups
        .flatMap((group) => group.lines)
        .filter((line) => line.label.toLowerCase().startsWith('e-recording'));

    // A deed and a mortgage; a cash closing sends the deed alone.
    expect(eRecording(purchase)).toHaveLength(2);
    expect(eRecording(cash)).toHaveLength(1);
    expect(eRecording(purchase).every((line) => line.value === E_RECORDING_FEE)).toBe(true);
    // It is on top of the clerk's per-page charge, so it cites us, not s. 28.24.
    expect(eRecording(purchase).every((line) => line.sourceUrl === undefined)).toBe(true);
  });

  it('totals the groups it prints, and nothing else', () => {
    const result = estimateFromAssessedValue({
      ...ASSESSED_DEFAULTS,
      assessedValue: 500_000,
      loanAmount: 400_000,
    });

    const lines = result.groups.flatMap((group) => group.lines);
    const summed = Math.round(lines.reduce((running, line) => running + line.value, 0) * 100) / 100;

    expect(result.total).toBe(summed);
  });
});
