// Which county a typed address is probably in.
//
// This exists for one job: /estimate asks for a property address, and the two
// things it needs from that address are the county — so it can send the reader
// to the right property appraiser — and nothing else. The premium itself is
// promulgated statewide, so a wrong county costs the reader a link, not a
// number.
//
// It is a *suggestion*, never a determination, and the page says so and leaves
// the county selector in the reader's hands. There is no statewide address
// service behind it and none is pretended: this is a list of place names inside
// the six counties we work in most, matched against the text that was typed.
//
// Deliberately not here: ZIP codes. A Florida ZIP crosses county lines often
// enough that a ZIP table would be wrong quietly, which is worse than being
// silent. A place name that sits in two counties (Lutz, Odessa, Jupiter Island)
// is left out for the same reason.

export interface PlaceMatch {
  countySlug: string;
  /** The place name that matched, so the page can show its reasoning. */
  place: string;
}

/**
 * Municipalities and well-known unincorporated communities, by county.
 * Every entry is inside exactly one of these counties.
 */
const PLACES: Record<string, string[]> = {
  'broward-county': [
    'Coral Springs',
    'Fort Lauderdale',
    'Ft Lauderdale',
    'Hollywood',
    'Pembroke Pines',
    'Pembroke Park',
    'Miramar',
    'Plantation',
    'Sunrise',
    'Davie',
    'Weston',
    'Parkland',
    'Coconut Creek',
    'Margate',
    'Tamarac',
    'Lauderhill',
    'Lauderdale Lakes',
    'Lauderdale-by-the-Sea',
    'Lauderdale by the Sea',
    'Oakland Park',
    'Wilton Manors',
    'Pompano Beach',
    'Deerfield Beach',
    'Hallandale Beach',
    'Hallandale',
    'Dania Beach',
    'Cooper City',
    'Southwest Ranches',
    'North Lauderdale',
    'Lighthouse Point',
    'Hillsboro Beach',
    'Sea Ranch Lakes',
    'West Park',
  ],
  'miami-dade-county': [
    'Miami Beach',
    'Miami Gardens',
    'Miami Lakes',
    'Miami Springs',
    'Miami Shores',
    'North Miami Beach',
    'North Miami',
    'South Miami',
    'West Miami',
    'Hialeah Gardens',
    'Hialeah',
    'Coral Gables',
    'Doral',
    'Aventura',
    'Homestead',
    'Florida City',
    'Kendall',
    'Cutler Bay',
    'Palmetto Bay',
    'Pinecrest',
    'Sweetwater',
    'Opa-locka',
    'Opa locka',
    'Key Biscayne',
    'Sunny Isles Beach',
    'Bal Harbour',
    'Surfside',
    'Golden Beach',
    'Medley',
    'Coconut Grove',
    // Last, so "Miami Beach" and "Miami Gardens" are tested before it.
    'Miami',
  ],
  'palm-beach-county': [
    'West Palm Beach',
    'Palm Beach Gardens',
    'North Palm Beach',
    'Royal Palm Beach',
    'Boca Raton',
    'Delray Beach',
    'Boynton Beach',
    'Jupiter',
    'Wellington',
    'Westlake',
    'Lake Worth Beach',
    'Lake Worth',
    'Greenacres',
    'Riviera Beach',
    'Tequesta',
    'Juno Beach',
    'Belle Glade',
    'Pahokee',
    'South Bay',
    'Loxahatchee',
    'Palm Springs',
    'Lantana',
    'Highland Beach',
    'Manalapan',
    'Ocean Ridge',
    'Gulf Stream',
    'Atlantis',
    'Palm Beach',
  ],
  'hillsborough-county': [
    'Tampa',
    'Brandon',
    'Riverview',
    'Plant City',
    'Temple Terrace',
    'Valrico',
    'Apollo Beach',
    'Ruskin',
    'Gibsonton',
    'Seffner',
    'Thonotosassa',
    'Wimauma',
    'Sun City Center',
    'Town n Country',
    'Carrollwood',
    'Westchase',
  ],
  'orange-county': [
    'Orlando',
    'Winter Park',
    'Winter Garden',
    'Apopka',
    'Ocoee',
    'Maitland',
    'Windermere',
    'Belle Isle',
    'Edgewood',
    'Eatonville',
    'Oakland',
    'Bay Lake',
    'Lake Buena Vista',
    'Pine Hills',
    'Dr Phillips',
  ],
  // The five places the Duval County Property Appraiser's own search page names
  // as the whole of the county.
  'duval-county': [
    'Jacksonville Beach',
    'Atlantic Beach',
    'Neptune Beach',
    'Baldwin',
    'Jacksonville',
  ],
};

/** Collapses punctuation and spacing so "Ft. Lauderdale" reaches "Ft Lauderdale". */
function normalise(text: string): string {
  return ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;
}

/**
 * The county a typed address is probably in, or null when nothing matches.
 *
 * Longest place name first, so "Palm Beach Gardens" is not read as "Palm Beach"
 * and "North Miami Beach" is not read as "Miami Beach".
 */
export function matchCounty(address: string): PlaceMatch | null {
  const haystack = normalise(address);
  if (haystack.trim() === '') return null;

  const candidates = Object.entries(PLACES)
    .flatMap(([countySlug, places]) => places.map((place) => ({ countySlug, place })))
    .sort((a, b) => b.place.length - a.place.length);

  for (const candidate of candidates) {
    if (haystack.includes(normalise(candidate.place))) return candidate;
  }

  return null;
}
