/**
 * The county numbers on the statewide roll.
 *
 * A wrong entry here is a figure attributed to the wrong county — the line
 * under the box would name an office that never published it — so the numbers
 * that have been seen coming back from the roll itself are asserted, and so is
 * the shape of the table that produces the rest.
 */
import { describe, expect, it } from 'vitest';

import { FLORIDA_COUNTIES, countyByCode, countyByName } from '@/lib/florida-counties';

describe('the Department of Revenue’s county numbers', () => {
  it('runs 11 to 77 with no gaps, one per county', () => {
    expect(FLORIDA_COUNTIES).toHaveLength(67);
    expect(FLORIDA_COUNTIES[0].code).toBe(11);
    expect(FLORIDA_COUNTIES[66].code).toBe(77);
    expect(new Set(FLORIDA_COUNTIES.map((county) => county.code)).size).toBe(67);
  });

  it('matches the numbers seen on real parcels', () => {
    // Each of these came back on a parcel looked up during development.
    expect(countyByCode(13)?.name).toBe('Bay County');
    expect(countyByCode(16)?.name).toBe('Broward County');
    expect(countyByCode(26)?.name).toBe('Duval County');
    expect(countyByCode(46)?.name).toBe('Lee County');
    expect(countyByCode(58)?.name).toBe('Orange County');
    expect(countyByCode(60)?.name).toBe('Palm Beach County');
    expect(countyByCode(74)?.name).toBe('Volusia County');
  });

  it('files Miami-Dade where the roll files it, under Dade', () => {
    expect(countyByCode(23)?.slug).toBe('miami-dade-county');
  });

  it('knows nothing about a number that is not a county', () => {
    expect(countyByCode(0)).toBeNull();
    expect(countyByCode(78)).toBeNull();
    expect(countyByCode('26')).toBeNull();
  });

  it('reads a county name with or without the word county on it', () => {
    expect(countyByName('Manatee')?.slug).toBe('manatee-county');
    expect(countyByName('Manatee County')?.slug).toBe('manatee-county');
    expect(countyByName('St. Lucie County')?.slug).toBe('st-lucie-county');
    expect(countyByName('Nowhere')).toBeNull();
    expect(countyByName(null)).toBeNull();
  });

  it('slugs the way the locations table does', () => {
    const slugs = FLORIDA_COUNTIES.map((county) => county.slug);
    expect(slugs).toContain('palm-beach-county');
    expect(slugs).toContain('indian-river-county');
    expect(slugs).toContain('st-johns-county');
  });
});
