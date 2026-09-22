// The cities with a page of their own, and the county each sits in.
//
// A city page is the county page's facts, addressed to the place the reader
// actually typed: nobody searches for "title company Broward County" when they
// live in Fort Lauderdale. Every closing figure on a city page — premium, deed
// stamps, recording, who customarily pays — is read off the county it belongs
// to, so a city carries nothing here that could disagree with its county.
//
// Which cities: the sixteen most populous municipalities in Florida, by the
// Census Bureau's Vintage 2024 estimates of the resident population of
// incorporated places (sub-est2024.csv, read on 2026-09-20 — see
// POPULATION_SOURCE). Population is the one figure a city carries of its own,
// and it is here so the order of the list, and the rank a page prints, can be
// checked against the file rather than remembered.
//
// A city is in code rather than in the locations table because its county is
// a fact about geography, not about an office: it does not need checking
// against a public record the way a clerk's URL does, and it never changes.
//
// What a city page says about its municipality itself — where the building
// department publishes permit records, how a code enforcement lien is
// released, who answers a municipal lien search — is in
// lib/municipal-records.ts, each fact quoted from the city's own site with the
// URL it was read from. A fact that was not found there is withheld and the
// page says so.

export interface FloridaCity {
  slug: string;
  name: string;
  /** Must exist in lib/florida-counties.ts, and have a row in the locations table. */
  countySlug: string;
  /** Resident population, Census Bureau Vintage 2024 estimate (POPESTIMATE2024). */
  population: number;
}

/** The Census file every population figure below was read from, on 2026-09-20. */
export const POPULATION_SOURCE = {
  cite: 'U.S. Census Bureau, Vintage 2024 population estimates for incorporated places',
  url: 'https://www2.census.gov/programs-surveys/popest/datasets/2020-2024/cities/totals/sub-est2024.csv',
  vintage: 'July 1, 2024',
  checkedOn: '2026-09-20',
} as const;

/** In population order, most populous first. The rank a page prints is the index plus one. */
export const FLORIDA_CITIES: FloridaCity[] = [
  { slug: 'jacksonville', name: 'Jacksonville', countySlug: 'duval-county', population: 1_009_833 },
  { slug: 'miami', name: 'Miami', countySlug: 'miami-dade-county', population: 487_014 },
  { slug: 'tampa', name: 'Tampa', countySlug: 'hillsborough-county', population: 414_547 },
  { slug: 'orlando', name: 'Orlando', countySlug: 'orange-county', population: 334_854 },
  { slug: 'st-petersburg', name: 'St. Petersburg', countySlug: 'pinellas-county', population: 267_102 },
  { slug: 'port-st-lucie', name: 'Port St. Lucie', countySlug: 'st-lucie-county', population: 258_575 },
  { slug: 'hialeah', name: 'Hialeah', countySlug: 'miami-dade-county', population: 235_388 },
  { slug: 'cape-coral', name: 'Cape Coral', countySlug: 'lee-county', population: 233_025 },
  { slug: 'tallahassee', name: 'Tallahassee', countySlug: 'leon-county', population: 205_089 },
  { slug: 'fort-lauderdale', name: 'Fort Lauderdale', countySlug: 'broward-county', population: 190_641 },
  { slug: 'pembroke-pines', name: 'Pembroke Pines', countySlug: 'broward-county', population: 179_326 },
  { slug: 'hollywood', name: 'Hollywood', countySlug: 'broward-county', population: 159_073 },
  { slug: 'gainesville', name: 'Gainesville', countySlug: 'alachua-county', population: 148_720 },
  { slug: 'miramar', name: 'Miramar', countySlug: 'broward-county', population: 143_242 },
  { slug: 'palm-bay', name: 'Palm Bay', countySlug: 'brevard-county', population: 142_023 },
  { slug: 'coral-springs', name: 'Coral Springs', countySlug: 'broward-county', population: 140_808 },
];

export function cityBySlug(slug: string): FloridaCity | null {
  return FLORIDA_CITIES.find((city) => city.slug === slug) ?? null;
}

/** 1 for Jacksonville, 16 for Coral Springs: the city's place among Florida's municipalities by population. */
export function populationRank(city: Pick<FloridaCity, 'slug'>): number {
  return FLORIDA_CITIES.findIndex((entry) => entry.slug === city.slug) + 1;
}

export function citiesInCounty(countySlug: string): FloridaCity[] {
  return FLORIDA_CITIES.filter((city) => city.countySlug === countySlug);
}

/** "Title company in Tampa, FL: title insurance and closings" — the page title's shape. */
export function cityPageTitle(city: Pick<FloridaCity, 'name'>): string {
  return `Title company in ${city.name}, FL: title insurance and closings`;
}
