// The Department of Revenue's county numbers, and the names and slugs they
// stand for.
//
// Every row of the statewide parcel roll carries CO_NO rather than a county
// name, so a figure fetched from it can only say which county it belongs to
// through this table. The numbers run 11 to 77 in alphabetical order with no
// gaps — sixty-seven counties, sixty-seven numbers — with Miami-Dade filed
// under its old name, Dade, at 23.
//
// Spot-checked against the roll itself: 13 came back on a Bay County parcel, 16
// on a Broward one, 26 Duval, 46 Lee, 58 Orange, 60 Palm Beach, 74 Volusia.
// tests/rolls.live.test.ts checks the rest of the registry's counties the same
// way, by resolving a real address in each and comparing the name.

export interface FloridaCounty {
  code: number;
  name: string;
  slug: string;
}

const NAMES = [
  'Alachua', 'Baker', 'Bay', 'Bradford', 'Brevard', 'Broward', 'Calhoun', 'Charlotte', 'Citrus',
  'Clay', 'Collier', 'Columbia', 'Miami-Dade', 'DeSoto', 'Dixie', 'Duval', 'Escambia', 'Flagler',
  'Franklin', 'Gadsden', 'Gilchrist', 'Glades', 'Gulf', 'Hamilton', 'Hardee', 'Hendry', 'Hernando',
  'Highlands', 'Hillsborough', 'Holmes', 'Indian River', 'Jackson', 'Jefferson', 'Lafayette',
  'Lake', 'Lee', 'Leon', 'Levy', 'Liberty', 'Madison', 'Manatee', 'Marion', 'Martin', 'Monroe',
  'Nassau', 'Okaloosa', 'Okeechobee', 'Orange', 'Osceola', 'Palm Beach', 'Pasco', 'Pinellas',
  'Polk', 'Putnam', 'St. Johns', 'St. Lucie', 'Santa Rosa', 'Sarasota', 'Seminole', 'Sumter',
  'Suwannee', 'Taylor', 'Union', 'Volusia', 'Wakulla', 'Walton', 'Washington',
];

/** The same slug the locations table uses, so a county resolves to its page. */
export function countySlugFor(name: string): string {
  return `${name} County`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export const FLORIDA_COUNTIES: FloridaCounty[] = NAMES.map((name, index) => ({
  code: 11 + index,
  name: `${name} County`,
  slug: countySlugFor(name),
}));

const BY_CODE = new Map(FLORIDA_COUNTIES.map((county) => [county.code, county]));

/** The county a statewide parcel row belongs to, from its CO_NO. */
export function countyByCode(code: unknown): FloridaCounty | null {
  return typeof code === 'number' ? (BY_CODE.get(code) ?? null) : null;
}

/** "Manatee County" or "Manatee", as a geocoder happens to write it. */
export function countyByName(name: string | null | undefined): FloridaCounty | null {
  if (!name) return null;
  const wanted = countySlugFor(name.replace(/\s+county$/i, ''));
  return FLORIDA_COUNTIES.find((county) => county.slug === wanted) ?? null;
}
