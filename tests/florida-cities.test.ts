/**
 * The city pages.
 *
 * A city page renders its county's figures, so a city filed under the wrong
 * county would print another county's deed stamp rate and recording office
 * under the city's name — with a citation beside each, which makes it worse.
 * The county each city sits in is asserted here, as is which cities get a page
 * at all: the sixteen most populous in the state, by the Census file the list
 * cites, in that order.
 */
import { describe, expect, it } from 'vitest';

import {
  FLORIDA_CITIES,
  POPULATION_SOURCE,
  cityBySlug,
  citiesInCounty,
  populationRank,
} from '@/lib/florida-cities';
import { FLORIDA_COUNTIES } from '@/lib/florida-counties';
import { COUNTY_MARKETS, COUNTY_REGIONS, countyPageTitle } from '@/lib/locations';

describe('the cities with a page', () => {
  it('are the sixteen most populous in Florida, most populous first', () => {
    // Read from the Census Bureau's Vintage 2024 file (POPULATION_SOURCE) on
    // 2026-09-20: the sixteen incorporated places in Florida with the largest
    // POPESTIMATE2024, in that order. West Palm Beach is seventeenth.
    expect(FLORIDA_CITIES.map((city) => city.slug)).toEqual([
      'jacksonville',
      'miami',
      'tampa',
      'orlando',
      'st-petersburg',
      'port-st-lucie',
      'hialeah',
      'cape-coral',
      'tallahassee',
      'fort-lauderdale',
      'pembroke-pines',
      'hollywood',
      'gainesville',
      'miramar',
      'palm-bay',
      'coral-springs',
    ]);
    expect(FLORIDA_CITIES).toHaveLength(16);
    for (let i = 1; i < FLORIDA_CITIES.length; i += 1) {
      expect(FLORIDA_CITIES[i - 1].population).toBeGreaterThan(FLORIDA_CITIES[i].population);
    }
    expect(POPULATION_SOURCE.url).toMatch(/^https:\/\/www2\.census\.gov\//);
    expect(POPULATION_SOURCE.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('each sit in a real Florida county', () => {
    const slugs = new Set(FLORIDA_COUNTIES.map((county) => county.slug));
    for (const city of FLORIDA_CITIES) {
      expect(slugs.has(city.countySlug), `${city.name} → ${city.countySlug}`).toBe(true);
    }
  });

  it('are filed under the county they are actually in', () => {
    expect(cityBySlug('jacksonville')?.countySlug).toBe('duval-county');
    expect(cityBySlug('miami')?.countySlug).toBe('miami-dade-county');
    expect(cityBySlug('tampa')?.countySlug).toBe('hillsborough-county');
    expect(cityBySlug('orlando')?.countySlug).toBe('orange-county');
    expect(cityBySlug('st-petersburg')?.countySlug).toBe('pinellas-county');
    expect(cityBySlug('port-st-lucie')?.countySlug).toBe('st-lucie-county');
    expect(cityBySlug('hialeah')?.countySlug).toBe('miami-dade-county');
    expect(cityBySlug('cape-coral')?.countySlug).toBe('lee-county');
    expect(cityBySlug('tallahassee')?.countySlug).toBe('leon-county');
    expect(cityBySlug('fort-lauderdale')?.countySlug).toBe('broward-county');
    expect(cityBySlug('pembroke-pines')?.countySlug).toBe('broward-county');
    expect(cityBySlug('hollywood')?.countySlug).toBe('broward-county');
    expect(cityBySlug('gainesville')?.countySlug).toBe('alachua-county');
    expect(cityBySlug('miramar')?.countySlug).toBe('broward-county');
    expect(cityBySlug('palm-bay')?.countySlug).toBe('brevard-county');
    expect(cityBySlug('coral-springs')?.countySlug).toBe('broward-county');
  });

  it('rank from one, in population order', () => {
    expect(populationRank({ slug: 'jacksonville' })).toBe(1);
    expect(populationRank({ slug: 'coral-springs' })).toBe(16);
  });

  it('have one slug each, in the shape the route expects', () => {
    const slugs = FLORIDA_CITIES.map((city) => city.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('group by county for the "elsewhere in this county" list', () => {
    expect(citiesInCounty('broward-county').map((city) => city.slug)).toEqual([
      'fort-lauderdale',
      'pembroke-pines',
      'hollywood',
      'miramar',
      'coral-springs',
    ]);
    expect(citiesInCounty('nowhere-county')).toEqual([]);
  });

  it('no longer carries the two withdrawn pages', () => {
    // Boca Raton and West Palm Beach had pages before the list became the
    // sixteen most populous. next.config.mjs redirects both to the county.
    expect(cityBySlug('boca-raton')).toBeNull();
    expect(cityBySlug('west-palm-beach')).toBeNull();
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

  it('cover every county a city page sits in', () => {
    for (const city of FLORIDA_CITIES) {
      expect(COUNTY_MARKETS[city.countySlug], city.countySlug).toBeDefined();
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
