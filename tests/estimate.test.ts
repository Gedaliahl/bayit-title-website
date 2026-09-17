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

  it('adds the simultaneous loan policy at $25 when there is a loan', () => {
    const result = estimateFromAssessedValue({
      ...ASSESSED_DEFAULTS,
      assessedValue: 500_000,
      loanAmount: 400_000,
    });

    expect(result.premiumTotal).toBe(originalPremium(500_000) + 25);
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

    it('keeps the premium identical across counties', () => {
      const broward = estimateFromAssessedValue({ ...inputs, countySlug: 'broward-county' });
      const dade = estimateFromAssessedValue({ ...inputs, countySlug: 'miami-dade-county' });

      expect(dade.premiumTotal).toBe(broward.premiumTotal);
    });

    it('charges Miami-Dade’s 60-cent deed rate where the rest of Florida pays 70', () => {
      const broward = estimateFromAssessedValue({ ...inputs, countySlug: 'broward-county' });
      const dade = estimateFromAssessedValue({ ...inputs, countySlug: 'miami-dade-county' });

      const deedTax = (result: ReturnType<typeof estimateFromAssessedValue>) =>
        result.groups
          .flatMap((group) => group.lines)
          .find((line) => line.label.toLowerCase().includes('deed'))?.value;

      expect(deedTax(broward)).toBe(deedStampTaxDue(500_000, 'broward-county'));
      expect(deedTax(dade)).toBe(deedStampTaxDue(500_000, 'miami-dade-county'));
      expect(deedTax(dade)).toBeLessThan(deedTax(broward) as number);
    });

    it('adds the surtax in Miami-Dade only when it is not a single-family residence', () => {
      const home = estimateFromAssessedValue({ ...inputs, countySlug: 'miami-dade-county' });
      const other = estimateFromAssessedValue({
        ...inputs,
        countySlug: 'miami-dade-county',
        singleFamilyResidence: false,
      });
      const elsewhere = estimateFromAssessedValue({
        ...inputs,
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

    expect(result.premiumTotal).toBe(originalPremium(500_000) + 25);
    expect(result.total).toBeGreaterThan(result.premiumTotal);

    const premiumLabels = (premiumOf(result)?.lines ?? []).map((line) => line.label.toLowerCase());
    expect(premiumLabels.some((label) => label.includes('stamp'))).toBe(false);
    expect(premiumLabels.some((label) => label.includes('recording'))).toBe(false);

    const deedLine = result.groups
      .flatMap((group) => group.lines)
      .find((line) => line.label.toLowerCase().includes('deed') && !line.label.includes('Recording'));

    expect(deedLine?.note).toMatch(/consideration/i);
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
