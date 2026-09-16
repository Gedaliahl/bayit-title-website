// Looking an address up on the public tax roll, so the estimator can fill the
// assessed value in instead of asking the reader to go and find it.
//
// Two kinds of source sit behind this, and they are not interchangeable:
//
//  1. COUNTY ROLLS. Four property appraisers publish their certified roll as an
//     open ArcGIS feature service — address, parcel number, just value and
//     assessed value in the same row. Those are the counties where typing an
//     address can produce both a suggestion and a figure, and where the figure
//     is the appraiser's own rather than an estimate of one.
//
//  2. THE CENSUS GEOCODER. Free, keyless, statewide, and knows nothing about
//     value. It covers the other sixty-three counties for the address half of
//     the job and names the county the address is in, which is the thing the
//     place-name guess in lib/florida-places.ts can only approximate. The
//     assessed value there stays a box the reader fills in, with the link to
//     their appraiser next to it, exactly as it was before.
//
// Deliberately not here: a paid aggregator. The four rolls and the geocoder are
// public records published by the office that keeps them, which is what lets
// the page print where every figure came from and link a reader to it. An
// aggregator would cover all 67 counties and none of that would be true.
//
// The statewide FDOR parcel layer (services9.arcgis.com, Florida_Statewide_
// Cadastral) was tried for the other counties and is not usable here: attribute
// queries against its 10.8 million rows time out at around 55 seconds, and a
// point query off a geocoded coordinate lands on the road right-of-way parcel
// rather than the house, because the geocoder interpolates along the street
// centreline. A wrong assessed value that looks right is worse than an empty
// box, so the empty box stays.
import 'server-only';

import {
  formatAddressForDisplay,
  formatPlaceForDisplay,
  normalizeForMatch,
  parseTypedAddress,
  rollAddressPrefix,
  scoreAddressMatch,
  type TypedAddress,
} from './address-format';

export interface PropertySuggestion {
  /** Stable enough to key a list on: county plus parcel, or the address itself. */
  id: string;
  /** "1409 NW 48th St", as the roll spells it. */
  address: string;
  city: string | null;
  zip: string | null;
  countySlug: string;
  countyName: string;
  parcelId: string | null;
  /** The county's assessed value — capped by Save Our Homes where it applies. */
  assessedValue: number | null;
  /** Just (market) value, which is the figure a policy would more nearly be written at. */
  justValue: number | null;
  /** The roll year, where the county publishes it with the row. */
  rollYear: number | null;
  /** How the property is classified, in the appraiser's words. */
  useDescription: string | null;
  /** Named and linked under the figure, because an unsourced number is a rumour. */
  sourceName: string;
  sourceUrl: string;
}

interface RollRow {
  address: string;
  city: string | null;
  zip: string | null;
  parcelId: string | null;
  assessedValue: number | null;
  justValue: number | null;
  rollYear: number | null;
  useDescription: string | null;
}

interface RollSource {
  countySlug: string;
  countyName: string;
  /** Cited under the figure. */
  sourceName: string;
  /** Where a reader checks the figure against the office that published it. */
  sourceUrl: string;
  /** The layer's /query endpoint. */
  serviceUrl: string;
  outFields: string[];
  /** Null where the typed text cannot address this roll — no house number, usually. */
  where: (parsed: TypedAddress) => string | null;
  read: (attributes: Record<string, unknown>) => RollRow | null;
}

/** The date each service URL, field mapping and value column below was last checked. */
export const ROLL_SOURCES_CHECKED_ON = '2026-09-16';

const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;

const str = (value: unknown): string | null => {
  const text = typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
  return text === '' ? null : text;
};

/** Situs ZIPs arrive as numbers, sometimes as ZIP+4 run together. */
const zip5 = (value: unknown): string | null => {
  const digits = str(value)?.replace(/\D/g, '') ?? '';
  return digits.length >= 5 ? digits.slice(0, 5) : null;
};

/**
 * Broward stores the situs city as a two-letter code and publishes no lookup
 * table with the layer. Every code below was derived from the roll itself: for
 * each code, the most common owner-mailing city among its homesteaded parcels,
 * which is the owner living at the property. `BC` (no street numbers, ZIPs in
 * the unincorporated north of the county) and `DN` (State Road 84 at 33312) do
 * not resolve that way and are read as unincorporated Broward and Dania Beach.
 *
 * It is a display label and nothing else — no figure and no county depends on
 * it, so a wrong entry costs a line of text under a suggestion.
 */
const BROWARD_CITY_CODES: Record<string, string> = {
  BC: 'Unincorporated Broward',
  CK: 'Coconut Creek',
  CS: 'Coral Springs',
  CY: 'Cooper City',
  DB: 'Deerfield Beach',
  DN: 'Dania Beach',
  DV: 'Davie',
  FL: 'Fort Lauderdale',
  HA: 'Hallandale Beach',
  HB: 'Hillsboro Beach',
  HW: 'Hollywood',
  LH: 'Lauderhill',
  LL: 'Lauderdale Lakes',
  LP: 'Lighthouse Point',
  LS: 'Lauderdale-by-the-Sea',
  LZ: 'Lazy Lake',
  MG: 'Margate',
  MM: 'Miramar',
  NL: 'North Lauderdale',
  OP: 'Oakland Park',
  PA: 'Parkland',
  PB: 'Pompano Beach',
  PI: 'Pembroke Pines',
  PK: 'Pembroke Park',
  PL: 'Plantation',
  SL: 'Sea Ranch Lakes',
  SU: 'Sunrise',
  SW: 'Southwest Ranches',
  TM: 'Tamarac',
  WM: 'Wilton Manors',
  WP: 'West Park',
  WS: 'Weston',
};

/**
 * A house number is required by every source here. Without one a roll query
 * returns the first two thousand rows of a street and the reader learns
 * nothing, so the estimator waits rather than guesses.
 */
const ROLL_SOURCES: RollSource[] = [
  {
    countySlug: 'broward-county',
    countyName: 'Broward County',
    sourceName: 'Broward County Property Appraiser tax roll',
    sourceUrl: 'https://web.bcpa.net/BcpaClient/#/Record-Search',
    serviceUrl:
      'https://services.arcgis.com/JMAJrTsHNLrSsWf5/arcgis/rest/services/PARCEL_POLY_BCPA_TAXROLL/FeatureServer/0/query',
    outFields: [
      'FOLIO',
      'SITUS_STREET_NUMBER',
      'SITUS_STREET_DIRECTION',
      'SITUS_STREET_NAME',
      'SITUS_STREET_TYPE',
      'SITUS_UNIT_NUMBER',
      'SITUS_CITY',
      'SITUS_ZIP_CODE',
      'JUST_LAND_VALUE',
      'JUST_BUILDING_VALUE',
      'JUST_OTHER_VALUE',
      'NEW_SOH_VALUE',
      'USE_TYPE',
    ],
    // Broward keeps the situs address in five columns, so this is the one
    // source that cannot take a prefix of the whole line. The street name is
    // matched as a prefix because "48" has to find "48" and nothing else has to
    // be typed exactly.
    where: (parsed) => {
      if (!parsed.number || parsed.street.length === 0) return null;
      const clauses = [`SITUS_STREET_NUMBER = '${sql(parsed.number)}'`];
      if (parsed.directional) clauses.push(`SITUS_STREET_DIRECTION = '${sql(parsed.directional)}'`);
      clauses.push(`SITUS_STREET_NAME LIKE '${sql(parsed.street[0])}%'`);
      return clauses.join(' AND ');
    },
    read: (a) => {
      const address = [
        str(a.SITUS_STREET_NUMBER),
        str(a.SITUS_STREET_DIRECTION),
        str(a.SITUS_STREET_NAME),
        str(a.SITUS_STREET_TYPE),
        str(a.SITUS_UNIT_NUMBER),
      ]
        .filter(Boolean)
        .join(' ');
      if (!address) return null;

      // The roll carries just value in three columns — land, building and
      // everything else — and no column that adds them up for you.
      const just =
        (num(a.JUST_LAND_VALUE) ?? 0) +
        (num(a.JUST_BUILDING_VALUE) ?? 0) +
        (num(a.JUST_OTHER_VALUE) ?? 0);

      const cityCode = str(a.SITUS_CITY);

      return {
        address,
        city: cityCode ? (BROWARD_CITY_CODES[cityCode] ?? null) : null,
        zip: zip5(a.SITUS_ZIP_CODE),
        parcelId: str(a.FOLIO),
        // NEW_SOH_VALUE is the assessed value after the Save Our Homes cap:
        // on a homesteaded parcel it is the taxable value plus the $50,000
        // exemption, which is how it was identified.
        assessedValue: num(a.NEW_SOH_VALUE),
        justValue: just > 0 ? just : null,
        rollYear: null,
        useDescription: null,
      };
    },
  },
  {
    countySlug: 'palm-beach-county',
    countyName: 'Palm Beach County',
    sourceName: 'Palm Beach County Property Appraiser roll',
    sourceUrl: 'https://pbcpao.gov/Property/Search',
    serviceUrl:
      'https://services1.arcgis.com/ZWOoUZbtaYePLlPw/arcgis/rest/services/Parcels_and_Property_Details_WebMercator/FeatureServer/0/query',
    outFields: [
      'PARID',
      'SITE_ADDR_STR',
      'MUNICIPALITY',
      'TOTAL_MARKET',
      'ASSESSED_VAL',
      'PROPERTY_USE',
    ],
    where: (parsed) => {
      const prefix = rollAddressPrefix(parsed);
      return prefix ? `SITE_ADDR_STR LIKE '${sql(prefix)}%'` : null;
    },
    read: (a) => {
      const address = str(a.SITE_ADDR_STR);
      if (!address) return null;
      return {
        address,
        // CITYNAME on this layer is the owner's mailing city — a Palm Beach
        // condominium owner in Connecticut has a Connecticut CITYNAME — so the
        // situs city is read off MUNICIPALITY instead.
        city: str(a.MUNICIPALITY),
        zip: null,
        parcelId: str(a.PARID),
        assessedValue: num(a.ASSESSED_VAL),
        justValue: num(a.TOTAL_MARKET),
        rollYear: null,
        useDescription: str(a.PROPERTY_USE),
      };
    },
  },
  {
    countySlug: 'miami-dade-county',
    countyName: 'Miami-Dade County',
    sourceName: 'Miami-Dade County Property Appraiser roll',
    sourceUrl: 'https://www.miamidade.gov/Apps/PA/propertysearch/',
    serviceUrl:
      'https://services.arcgis.com/8Pc9XBTAsYuxx9Ny/arcgis/rest/services/PaGISView_gdb/FeatureServer/0/query',
    outFields: [
      'FOLIO',
      'TRUE_SITE_ADDR',
      'TRUE_SITE_CITY',
      'TRUE_SITE_ZIP_CODE',
      'ASSESSED_VAL_CUR',
      'ASSESSMENT_YEAR_CUR',
      'DOR_DESC',
    ],
    where: (parsed) => {
      const prefix = rollAddressPrefix(parsed);
      return prefix ? `TRUE_SITE_ADDR LIKE '${sql(prefix)}%'` : null;
    },
    read: (a) => {
      const address = str(a.TRUE_SITE_ADDR);
      if (!address) return null;

      // A reference folio is the roll's placeholder for a condominium's parent
      // parcel: an address, no value and nothing anybody buys. It would sit at
      // the top of a search for the building, under the units that are real.
      if (str(a.DOR_DESC)?.toUpperCase() === 'REFERENCE FOLIO') return null;

      return {
        address,
        city: str(a.TRUE_SITE_CITY),
        zip: zip5(a.TRUE_SITE_ZIP_CODE),
        parcelId: str(a.FOLIO),
        assessedValue: num(a.ASSESSED_VAL_CUR),
        // This view publishes the assessed value and no market value, so the
        // estimator has the capped figure here and says so.
        justValue: null,
        rollYear: num(a.ASSESSMENT_YEAR_CUR),
        useDescription: str(a.DOR_DESC),
      };
    },
  },
  {
    countySlug: 'hillsborough-county',
    countyName: 'Hillsborough County',
    sourceName: 'Hillsborough County Property Appraiser roll',
    sourceUrl: 'https://gis.hcpafl.org/propertysearch/',
    serviceUrl:
      'https://services.arcgis.com/apTfC6SUmnNfnxuF/arcgis/rest/services/HCPA_Parcels_All/FeatureServer/0/query',
    outFields: ['FOLIO', 'SITE_ADDR', 'SITE_CITY', 'SITE_ZIP', 'JUST', 'ASD_VAL'],
    where: (parsed) => {
      const prefix = rollAddressPrefix(parsed);
      return prefix ? `SITE_ADDR LIKE '${sql(prefix)}%'` : null;
    },
    read: (a) => {
      const address = str(a.SITE_ADDR);
      if (!address) return null;
      return {
        address,
        city: str(a.SITE_CITY),
        zip: zip5(a.SITE_ZIP),
        parcelId: str(a.FOLIO),
        assessedValue: num(a.ASD_VAL),
        justValue: num(a.JUST),
        rollYear: null,
        useDescription: null,
      };
    },
  },
];

/** The counties a typed address can be priced from without the reader looking anything up. */
export const ROLL_COUNTY_SLUGS = ROLL_SOURCES.map((source) => source.countySlug);

/**
 * Single quotes are the only character that can end a string literal in these
 * services' SQL, and normalizeAddressText has already dropped everything that
 * is not a letter, a digit, a space, `#`, `/` or `-`. Doubling the quote is
 * belt to that braces: the input reaching here cannot contain one.
 */
function sql(value: string): string {
  return value.replace(/'/g, "''").replace(/[%_]/g, '');
}

/** Upstreams get four seconds. A dropdown that arrives later is not a dropdown. */
const UPSTREAM_TIMEOUT_MS = 4_000;

/**
 * Rows for one prefix do not change between two readers typing it, so the
 * answer is cached for an hour against the upstream URL. The roll itself moves
 * once a year.
 */
async function getJson(url: string): Promise<unknown | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      next: { revalidate: 3_600 },
      headers: { accept: 'application/json' },
    });
    if (!response.ok) {
      console.warn(`[property-lookup] ${new URL(url).host} answered ${response.status}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    // One roll being down is a missing suggestion, never a failed page.
    console.warn(
      `[property-lookup] ${new URL(url).host} failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
}

/** How many rows a single roll is asked for before scoring narrows them down. */
const ROWS_PER_SOURCE = 25;

async function queryRoll(
  source: RollSource,
  parsed: TypedAddress,
  typed: string,
): Promise<PropertySuggestion[]> {
  const where = source.where(parsed);
  if (!where) return [];

  const url = `${source.serviceUrl}?${new URLSearchParams({
    where,
    outFields: source.outFields.join(','),
    returnGeometry: 'false',
    resultRecordCount: String(ROWS_PER_SOURCE),
    f: 'json',
  })}`;

  const payload = (await getJson(url)) as
    | { features?: { attributes?: Record<string, unknown> }[]; error?: unknown }
    | null;

  if (!payload || payload.error || !Array.isArray(payload.features)) return [];

  const suggestions: PropertySuggestion[] = [];

  for (const feature of payload.features) {
    const row = feature.attributes ? source.read(feature.attributes) : null;
    if (!row) continue;
    if (scoreAddressMatch(typed, row.address) <= 0) continue;

    suggestions.push({
      id: `${source.countySlug}:${row.parcelId ?? row.address}`,
      address: formatAddressForDisplay(row.address),
      city: row.city ? formatPlaceForDisplay(row.city) : null,
      zip: row.zip,
      countySlug: source.countySlug,
      countyName: source.countyName,
      parcelId: row.parcelId,
      assessedValue: row.assessedValue,
      justValue: row.justValue,
      rollYear: row.rollYear,
      useDescription: row.useDescription ? formatPlaceForDisplay(row.useDescription) : null,
      sourceName: source.sourceName,
      sourceUrl: source.sourceUrl,
    });
  }

  return suggestions;
}

const CENSUS_GEOCODER =
  'https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress';

/** Census county names come back as "Duval County", which is how the locations table slugs them. */
function slugifyCounty(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

interface CensusMatch {
  matchedAddress?: string;
  geographies?: { Counties?: { NAME?: string; STATE?: string }[] };
}

/**
 * The statewide half. It answers with addresses it can place on a TIGER street
 * range and the county each one falls in, and with nothing about value — which
 * is the honest position outside the four rolls above.
 */
async function queryCensus(typed: string): Promise<PropertySuggestion[]> {
  const url = `${CENSUS_GEOCODER}?${new URLSearchParams({
    // The geocoder matches a street range rather than a place name, so an
    // address with no state on it would be matched against the whole country.
    address: /\bfl\b|florida/i.test(typed) ? typed : `${typed}, FL`,
    benchmark: 'Public_AR_Current',
    vintage: 'Current_Current',
    layers: 'Counties',
    format: 'json',
  })}`;

  const payload = (await getJson(url)) as
    | { result?: { addressMatches?: CensusMatch[] } }
    | null;

  const matches = payload?.result?.addressMatches ?? [];
  const suggestions: PropertySuggestion[] = [];

  for (const match of matches) {
    const county = match.geographies?.Counties?.[0];
    // STATE is the FIPS code; 12 is Florida. We are not licensed anywhere else.
    if (!match.matchedAddress || !county?.NAME || county.STATE !== '12') continue;

    // "1409 NW 48TH ST, BOCA RATON, FL, 33431" — split back up so the city and
    // the ZIP can sit under the street line like they do on a roll suggestion.
    const [street, city, , zip] = match.matchedAddress.split(',').map((part) => part.trim());

    suggestions.push({
      id: `census:${match.matchedAddress}`,
      address: formatAddressForDisplay(street ?? match.matchedAddress),
      city: city ? formatPlaceForDisplay(city) : null,
      zip: zip ?? null,
      countySlug: slugifyCounty(county.NAME),
      countyName: county.NAME,
      parcelId: null,
      assessedValue: null,
      justValue: null,
      rollYear: null,
      useDescription: null,
      sourceName: 'U.S. Census Bureau geocoder',
      sourceUrl: 'https://geocoding.geo.census.gov/geocoder/',
    });
  }

  return suggestions;
}

/** Short enough that it cannot be a street address; asking the rolls would waste a query. */
const MIN_QUERY_LENGTH = 5;

/** More than a dropdown can be read at a glance. */
const MAX_SUGGESTIONS = 8;

/**
 * What the estimator's address box offers while somebody types.
 *
 * The rolls and the geocoder are asked at the same time, not one after the
 * other: the rolls are the better answer where they exist, the geocoder is the
 * only answer everywhere else, and waiting for the first before starting the
 * second would put the slower of the two on the end of the faster one.
 */
export async function searchProperties(query: string): Promise<PropertySuggestion[]> {
  const typed = query.trim();
  if (typed.length < MIN_QUERY_LENGTH) return [];

  const parsed = parseTypedAddress(typed);
  if (!parsed.number) return [];

  const results = await Promise.all([
    ...ROLL_SOURCES.map((source) => queryRoll(source, parsed, typed)),
    queryCensus(typed),
  ]);

  const seen = new Set<string>();
  const merged: PropertySuggestion[] = [];

  for (const suggestion of results.flat()) {
    // A roll row and a geocoder row for the same house are the same
    // suggestion, and the roll's is the one carrying a figure. Rolls are
    // queried first above, so the first of a pair to arrive here wins. The
    // address is normalised for this: the roll writes "27 DR" where the
    // geocoder writes "27TH DR", and a key that spelled them differently would
    // show the same house twice, once with a figure and once without.
    //
    // The city is part of the key because one county really can hold the same
    // street address twice — 3301 N University Dr is a real address in both
    // Davie and Sunrise — and collapsing those two would hide a property behind
    // its namesake.
    const key = `${normalizeForMatch(suggestion.address)}|${suggestion.city ?? ''}|${
      suggestion.countySlug
    }`.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(suggestion);
  }

  return merged
    .map((suggestion) => ({
      suggestion,
      score:
        scoreAddressMatch(typed, suggestion.address) +
        // A suggestion that brings its own assessed value saves the reader the
        // errand this page exists to save them, so it breaks ties upward.
        (suggestion.assessedValue || suggestion.justValue ? 0.05 : 0) +
        // And one whose city is the city they typed is the one they meant.
        (parsed.locality && suggestion.city
          ? suggestion.city.toUpperCase().includes(parsed.locality.toUpperCase())
            ? 0.1
            : 0
          : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SUGGESTIONS)
    .map((entry) => entry.suggestion);
}
