// The cities with a page of their own, and the county each sits in.
//
// A city page is the county page's facts, addressed to the place the reader
// actually typed: nobody searches for "title company Broward County" when they
// live in Fort Lauderdale. Every figure on a city page — premium, deed stamps,
// recording, who customarily pays — is read off the county it belongs to, so a
// city carries nothing here that could disagree with its county. The one thing
// a city owns is which county that is.
//
// A city is in code rather than in the locations table because its county is
// a fact about geography, not about an office: it does not need checking
// against a public record the way a clerk's URL does, and it never changes.
//
// Everything a city page would say about its municipality itself — where the
// building department publishes permit records, which office answers a
// municipal lien search — is deliberately absent until the team supplies and
// checks it. The page says so rather than guessing.

export interface FloridaCity {
  slug: string;
  name: string;
  /** Must exist in lib/florida-counties.ts, and have a row in the locations table. */
  countySlug: string;
}

export const FLORIDA_CITIES: FloridaCity[] = [
  { slug: 'miami', name: 'Miami', countySlug: 'miami-dade-county' },
  { slug: 'fort-lauderdale', name: 'Fort Lauderdale', countySlug: 'broward-county' },
  { slug: 'hollywood', name: 'Hollywood', countySlug: 'broward-county' },
  { slug: 'coral-springs', name: 'Coral Springs', countySlug: 'broward-county' },
  { slug: 'boca-raton', name: 'Boca Raton', countySlug: 'palm-beach-county' },
  { slug: 'west-palm-beach', name: 'West Palm Beach', countySlug: 'palm-beach-county' },
  { slug: 'tampa', name: 'Tampa', countySlug: 'hillsborough-county' },
  { slug: 'st-petersburg', name: 'St. Petersburg', countySlug: 'pinellas-county' },
  { slug: 'orlando', name: 'Orlando', countySlug: 'orange-county' },
  { slug: 'jacksonville', name: 'Jacksonville', countySlug: 'duval-county' },
];

export function cityBySlug(slug: string): FloridaCity | null {
  return FLORIDA_CITIES.find((city) => city.slug === slug) ?? null;
}

export function citiesInCounty(countySlug: string): FloridaCity[] {
  return FLORIDA_CITIES.filter((city) => city.countySlug === countySlug);
}

/** "Title company in Tampa, FL: title insurance and closings" — the page title's shape. */
export function cityPageTitle(city: Pick<FloridaCity, 'name'>): string {
  return `Title company in ${city.name}, FL: title insurance and closings`;
}
