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
  it('prices the owner’s policy at the promulgated original rate', () => {
    const result = estimateFromAssessedValue({
      ...ASSESSED_DEFAULTS,
      assessedValue: 500_000,
    });

    expect(result.total).toBe(originalPremium(500_000));
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

    expect(result.total).toBe(originalPremium(500_000) + 25);
  });

  it('rates a refinance on the loan, never on the assessed value', () => {
    const result = estimateFromAssessedValue({
      ...ASSESSED_DEFAULTS,
      purpose: 'refinance',
      // A figure that would change the answer if it were being used.
      assessedValue: 900_000,
      loanAmount: 300_000,
    });

    expect(result.total).toBe(originalPremium(300_000));
    expect(result.lines).toHaveLength(1);
  });

  it('says nothing at all until it has been given a number', () => {
    expect(estimateFromAssessedValue(ASSESSED_DEFAULTS)).toEqual({
      lines: [],
      total: 0,
      alternateRateTotal: null,
    });
  });

  it('treats a negative value as no value rather than as a credit', () => {
    const result = estimateFromAssessedValue({
      ...ASSESSED_DEFAULTS,
      assessedValue: -100_000,
      loanAmount: -5,
    });

    expect(result.lines).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('never prices the transfer taxes, which are charged on consideration', () => {
    const result = estimateFromAssessedValue({
      ...ASSESSED_DEFAULTS,
      assessedValue: 500_000,
      loanAmount: 400_000,
    });

    const labels = result.lines.map((line) => line.label.toLowerCase());
    expect(labels.some((label) => label.includes('stamp'))).toBe(false);
    expect(labels.some((label) => label.includes('intangible'))).toBe(false);
    expect(labels.some((label) => label.includes('recording'))).toBe(false);
  });
});
