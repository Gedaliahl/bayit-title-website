/**
 * The city pages.
 *
 * A city page renders its county's figures, so a city filed under the wrong
 * county would print another county's deed stamp rate and recording office
 * under the city's name — with a citation beside each, which makes it worse.
 * The county each city sits in is asserted here, as is the shape the route
 * depends on.
 */
import { describe, expect, it } from 'vitest';

import { FLORIDA_CITIES, cityBySlug, citiesInCounty } from '@/lib/florida-cities';
import { FLORIDA_COUNTIES } from '@/lib/florida-counties';
import { COUNTY_MARKETS, COUNTY_REGIONS, countyPageTitle } from '@/lib/locations';

describe('the cities with a page', () => {
  it('each sit in a real Florida county', () => {
    const slugs = new Set(FLORIDA_COUNTIES.map((county) => county.slug));
    for (const city of FLORIDA_CITIES) {
      expect(slugs.has(city.countySlug), `${city.name} → ${city.countySlug}`).toBe(true);
    }
  });

  it('are filed under the county they are actually in', () => {
    expect(cityBySlug('miami')?.countySlug).toBe('miami-dade-county');
    expect(cityBySlug('fort-lauderdale')?.countySlug).toBe('broward-county');
    expect(cityBySlug('hollywood')?.countySlug).toBe('broward-county');
    expect(cityBySlug('coral-springs')?.countySlug).toBe('broward-county');
    expect(cityBySlug('boca-raton')?.countySlug).toBe('palm-beach-county');
    expect(cityBySlug('west-palm-beach')?.countySlug).toBe('palm-beach-county');
    expect(cityBySlug('tampa')?.countySlug).toBe('hillsborough-county');
    expect(cityBySlug('st-petersburg')?.countySlug).toBe('pinellas-county');
    expect(cityBySlug('orlando')?.countySlug).toBe('orange-county');
    expect(cityBySlug('jacksonville')?.countySlug).toBe('duval-county');
  });

  it('have one slug each, in the shape the route expects', () => {
    const slugs = FLORIDA_CITIES.map((city) => city.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('group by county for the "elsewhere in this county" list', () => {
    expect(citiesInCounty('broward-county').map((city) => city.slug).sort()).toEqual([
      'coral-springs',
      'fort-lauderdale',
      'hollywood',
    ]);
    expect(citiesInCounty('nowhere-county')).toEqual([]);
  });

  it('knows nothing about a slug that is not a city', () => {
    expect(cityBySlug('pennsylvania')).toBeNull();
  });
});

describe('county markets and regions', () => {
  it('name only real counties', () => {
    const slugs = new Set(FLORIDA_COUNTIES.map((county) => county.slug));
    for (const slug of [...Object.keys(COUNTY_MARKETS), ...Object.keys(COUNTY_REGIONS)]) {
      expect(slugs.has(slug), slug).toBe(true);
    }
  });

  it('put the market the county is known by in its title', () => {
    expect(countyPageTitle({ slug: 'hillsborough-county', name: 'Hillsborough County' })).toBe(
      'Title company in Hillsborough County, FL: Tampa closings',
    );
    // A county with no market entry still gets a title, without a dangling colon.
    expect(countyPageTitle({ slug: 'levy-county', name: 'Levy County' })).toBe(
      'Title company in Levy County, FL',
    );
  });
});
