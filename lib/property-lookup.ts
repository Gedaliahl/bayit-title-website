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
//  2. AN ADDRESS SERVICE PLUS THE STATEWIDE ROLL, in two steps. Orange and
//     Duval publish no roll with values in it, but they do publish where every
//     address is: Orange as the property appraiser's own address points, Duval
//     as the city's geocoder. A rooftop coordinate is enough, because the
//     Department of Revenue's statewide parcel layer answers "which parcel is
//     at this point" quickly even though it cannot be searched by address at
//     all. So the dropdown comes from the county and the figure is fetched
//     when a property is picked — and only if the parcel the point lands on
//     carries the address that was picked.
//
//  3. THE CENSUS GEOCODER. Free, keyless, statewide, and knows nothing about
//     value. It covers the remaining counties for the address half of the job
//     and names the county the address is in, which is the thing the
//     place-name guess in lib/florida-places.ts can only approximate. The
//     assessed value there stays a box the reader fills in, with the link to
//     their appraiser next to it, exactly as it was before.
//
// Deliberately not here: a paid aggregator. The four rolls and the geocoder are
// public records published by the office that keeps them, which is what lets
// the page print where every figure came from and link a reader to it. An
// aggregator would cover all 67 counties and none of that would be true.
//
// Why the statewide layer is only ever asked about a point: attribute queries
// against its 10.8 million rows time out at around 55 seconds, so it cannot be
// searched by address. Asked which parcel covers a coordinate, in its own
// projection, it answers in well under a second. That only helps where the
// coordinate is the roof rather than the road — the Census geocoder
// interpolates along the street centreline, and a point in the street finds a
// right-of-way parcel or nothing — which is why the two-step sources are the
// ones with a real address service behind them and the Census suggestions are
// left without a figure.
import 'server-only';

import { isInFlorida, toFloridaAlbers } from './florida-albers';

import {
  addressKey,
  addressesAgree,
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
  /**
   * Set where the values are a second request away rather than in hand, and
   * null where there is nothing further to ask. See resolveParcelValue.
   */
  valueLookup: ValueLookup | null;
}

/** How a suggestion's figures are fetched once somebody picks it. */
export type ValueLookup =
  /** A rooftop coordinate to ask the statewide parcel layer about. */
  | { kind: 'point'; lat: number; lon: number }
  /** Jacksonville's geocoder answers with a key first and a coordinate second. */
  | { kind: 'jacksonville'; magicKey: string };

/** What a lookup comes back with: the figures, and where they are from. */
export interface ParcelValue {
  address: string;
  parcelId: string | null;
  assessedValue: number | null;
  justValue: number | null;
  rollYear: number | null;
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

/**
 * Counties where picking an address produces a figure — either because the
 * roll carried it in the row, or because the parcel under the address can be
 * found and read on the statewide layer.
 */
export const VALUE_COUNTY_SLUGS = [
  ...ROLL_SOURCES.map((source) => source.countySlug),
  'orange-county',
  'duval-county',
];

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
async function getJson(url: string, timeoutMs = UPSTREAM_TIMEOUT_MS): Promise<unknown | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
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
      // The roll answered with the figures already in the row; there is
      // nothing further to ask.
      valueLookup: null,
    });
  }

  return suggestions;
}

/**
 * Orange County's property appraiser publishes its address points: every
 * address in the county, the parcel it belongs to, and where it is. No values —
 * those come from the statewide layer once a property is picked.
 */
const ORANGE_ADDRESS_POINTS =
  'https://services9.arcgis.com/r1v86axQrMiUWhdA/arcgis/rest/services/OCAddressLocator/FeatureServer/0/query';

const ORANGE_APPRAISER = 'https://ocpaweb.ocpafl.org/parcelsearch';

async function queryOrangeAddressPoints(
  parsed: TypedAddress,
  typed: string,
): Promise<PropertySuggestion[]> {
  // This source spells street types out — "1409 E Esther Street" — so the
  // prefix stops before the type. "Trl" is not the start of "Trail".
  const prefix = rollAddressPrefix(parsed, { dropStreetType: true });
  if (!prefix) return [];

  const url = `${ORANGE_ADDRESS_POINTS}?${new URLSearchParams({
    where: `UPPER(COMPLETE_ADDRESS) LIKE '${sql(prefix)}%' AND ADDRESS_STATUS = 'Active'`,
    outFields:
      'OFFICIAL_PARCEL_ID,COMPLETE_ADDRESS,UNIT,MUNICIPAL_JURISDICTION,ZIPCODE,LATITUDE,LONGITUDE',
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
    const a = feature.attributes ?? {};
    const street = str(a.COMPLETE_ADDRESS);
    const unit = str(a.UNIT);
    const address = [street, unit].filter(Boolean).join(' ');
    const latitude = typeof a.LATITUDE === 'number' ? a.LATITUDE : null;
    const longitude = typeof a.LONGITUDE === 'number' ? a.LONGITUDE : null;

    if (!address || scoreAddressMatch(typed, address) <= 0) continue;

    const city = str(a.MUNICIPAL_JURISDICTION);

    suggestions.push({
      id: `orange-county:${str(a.OFFICIAL_PARCEL_ID) ?? address}`,
      address: formatAddressForDisplay(address),
      // The appraiser writes "Unincorporated" where there is no city, which is
      // true and reads like a missing value, so it is named for what it is.
      city: city === 'Unincorporated' ? 'Unincorporated Orange' : (city ?? null),
      zip: zip5(a.ZIPCODE),
      countySlug: 'orange-county',
      countyName: 'Orange County',
      parcelId: str(a.OFFICIAL_PARCEL_ID),
      assessedValue: null,
      justValue: null,
      rollYear: null,
      useDescription: null,
      sourceName: 'Orange County Property Appraiser address points',
      sourceUrl: ORANGE_APPRAISER,
      valueLookup:
        latitude !== null && longitude !== null && isInFlorida(longitude, latitude)
          ? { kind: 'point', lat: latitude, lon: longitude }
          : null,
    });
  }

  return suggestions;
}

/**
 * Jacksonville — which is Duval County, the two having consolidated in 1968 —
 * runs a geocoder over the property appraiser's address points and parcels.
 *
 * Its findAddressCandidates endpoint wants a whole address and answers nothing
 * to a half-typed one, so the typing is done against `suggest`, which answers
 * with a key rather than a coordinate. The key is spent in resolveParcelValue
 * when somebody picks the address, which is also where the coordinate is
 * needed and not before.
 */
const JACKSONVILLE_GEOCODER =
  'https://maps.coj.net/coj/rest/services/Geocode/COMPOSITE_AddrPtFirst/GeocodeServer';

const DUVAL_APPRAISER = 'https://paopropertysearch.coj.net/Basic/Search.aspx';

/**
 * Which of the composite locator's three sources a suggestion came from.
 *
 * The key is base64 of "SubSourceName=ADDRESS|COMPOSITE_AddrPtFirst#fa=…",
 * which is Esri's business and not a documented contract, so this reads it
 * defensively: anything it cannot make sense of is returned as unknown and
 * kept, rather than silently emptying the county's suggestions if the format
 * ever changes.
 */
function suggestionSource(magicKey: string): 'ADDRESS' | 'PARCEL' | 'STREET' | 'UNKNOWN' {
  try {
    const decoded = Buffer.from(magicKey, 'base64').toString('utf8');
    const name = /SubSourceName=([A-Z]+)/.exec(decoded)?.[1];
    return name === 'ADDRESS' || name === 'PARCEL' || name === 'STREET' ? name : 'UNKNOWN';
  } catch {
    return 'UNKNOWN';
  }
}

async function queryJacksonvilleGeocoder(typed: string): Promise<PropertySuggestion[]> {
  // Only the street line. The locator covers one county and reads a city as
  // part of the thing being searched for: "1200 Riverside Ave, Jacksonville"
  // comes back as Jacksonville Heights Elementary, while "1200 Riverside Ave"
  // finds the building.
  const street = typed.split(',')[0]?.trim();
  if (!street) return [];

  const url = `${JACKSONVILLE_GEOCODER}/suggest?${new URLSearchParams({
    text: street,
    maxSuggestions: '8',
    f: 'json',
  })}`;

  const payload = (await getJson(url)) as
    | { suggestions?: { text?: string; magicKey?: string; isCollection?: boolean }[] }
    | null;

  const rows = payload?.suggestions ?? [];
  const suggestions: PropertySuggestion[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    // A collection is a street rather than an address — "HERSCHEL ST" with no
    // number — and there is no parcel under it to value.
    if (!row.text || !row.magicKey || row.isCollection) continue;

    // "4304 HERSCHEL ST, JACKSONVILLE, FL, 32210" — or "1200 RIVERSIDE AVE,
    // 32204", where the parts after the street are a ZIP and nothing else.
    const [street, ...rest] = row.text.split(',').map((part) => part.trim());
    if (!street) continue;

    const zip = rest.find((part) => /^\d{5}$/.test(part)) ?? null;
    const city = rest.find((part) => !/^\d{5}$/.test(part) && !/^[A-Z]{2}$/.test(part)) ?? null;

    // The locator also answers with streets — "HERSCHEL ST, 32204" — and with
    // any street whose name happens to appear in what was typed, so a city
    // typed after a comma pulls up every road named after it. There is no
    // parcel under a street, so these are not suggestions.
    if (!parseTypedAddress(street).number) continue;

    // Nor is a number interpolated along one. The composite locator answers
    // from three sources, and only two of them stand on a property: an address
    // point and a parcel. The third puts 1836 Challen Ave in the middle of
    // Challen Ave, between the parcels at 1835 and 1840 — and will do it for a
    // house number that does not exist at all. Those belong to the geocoder
    // half of this file, where a suggestion carries no figure.
    if (suggestionSource(row.magicKey) === 'STREET') continue;

    // The locator answers from address points and from parcels, so the same
    // address arrives twice. The first is the address point, which is the one
    // standing on the roof.
    const key = normalizeForMatch(street);
    if (seen.has(key)) continue;
    seen.add(key);

    suggestions.push({
      id: `duval-county:${row.magicKey}`,
      address: formatAddressForDisplay(street),
      city: city ? formatPlaceForDisplay(city) : null,
      zip: zip ?? null,
      countySlug: 'duval-county',
      countyName: 'Duval County',
      parcelId: null,
      assessedValue: null,
      justValue: null,
      rollYear: null,
      useDescription: null,
      sourceName: 'City of Jacksonville address locator',
      sourceUrl: DUVAL_APPRAISER,
      valueLookup: { kind: 'jacksonville', magicKey: row.magicKey },
    });
  }

  return suggestions;
}

/**
 * The Department of Revenue's statewide parcel layer, asked the one question it
 * answers quickly: which parcel covers this point.
 */
const STATEWIDE_PARCELS =
  'https://services9.arcgis.com/Gh9awoU677aKree0/arcgis/rest/services/Florida_Statewide_Cadastral/FeatureServer/0/query';

const STATEWIDE_SOURCE_URL =
  'https://floridarevenue.com/property/Pages/DataPortal.aspx';

/** The roll is a year's work; a lookup against it can have longer than a keystroke. */
const VALUE_TIMEOUT_MS = 9_000;

async function jacksonvillePoint(magicKey: string): Promise<{ lat: number; lon: number } | null> {
  const url = `${JACKSONVILLE_GEOCODER}/findAddressCandidates?${new URLSearchParams({
    magicKey,
    outSR: '4326',
    maxLocations: '1',
    f: 'json',
  })}`;

  const payload = (await getJson(url)) as
    | { candidates?: { location?: { x?: number; y?: number } }[] }
    | null;

  const location = payload?.candidates?.[0]?.location;
  if (typeof location?.x !== 'number' || typeof location?.y !== 'number') return null;
  // The locator has a handful of records whose coordinates are a pair of small
  // numbers in the Gulf of Guinea. They are not Florida and not this house.
  if (!isInFlorida(location.x, location.y)) return null;

  return { lat: location.y, lon: location.x };
}

/** Digits only: the offices that keep these numbers punctuate them differently. */
const parcelDigits = (value: string) => value.replace(/\D/g, '');

/**
 * Whether two offices are naming the same parcel.
 *
 * Orange County writes its parcel number township-range-section where the
 * Department of Revenue writes section-township-range — 29-23-01-549601120
 * against 01-23-29-549601120 — and every digit after those six is identical.
 * Nothing else is guessed at: a number that matches neither way is a different
 * parcel.
 */
export function parcelIdsAgree(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;

  const left = parcelDigits(a);
  const right = parcelDigits(b);

  if (left.length < 7 || left.length !== right.length) return false;
  if (left === right) return true;

  const reordered = right.slice(4, 6) + right.slice(2, 4) + right.slice(0, 2) + right.slice(6);
  return left === reordered;
}

/**
 * The figures for a property somebody has just picked, from the statewide roll.
 *
 * The parcel is found by where it is, so something has to confirm it is the
 * right parcel. Two things can: the parcel number, where the county's address
 * service published one, or failing that the address on the row. A point that
 * lands on a right-of-way strip, a condominium's parent parcel or the lot next
 * door satisfies neither, and an empty box with the appraiser's link beside it
 * is the honest outcome of all three.
 *
 * The parcel number is the better of the two and the reason it is tried first:
 * a corner lot is filed by the county under one of its streets and by the
 * Department of Revenue under the other — 1409 E Esther Street in Orlando is
 * 1919 Pine Bluff Ave on the state roll, one parcel with two front doors — and
 * on the address alone this would decline a figure it has every reason to be
 * sure of.
 */
export async function resolveParcelValue(
  lookup: ValueLookup,
  address: string,
  countyName: string,
  parcelId: string | null = null,
): Promise<ParcelValue | null> {
  const point =
    lookup.kind === 'point'
      ? { lat: lookup.lat, lon: lookup.lon }
      : await jacksonvillePoint(lookup.magicKey);

  if (!point || !isInFlorida(point.lon, point.lat)) return null;

  const { x, y } = toFloridaAlbers(point.lon, point.lat);

  const url = `${STATEWIDE_PARCELS}?${new URLSearchParams({
    geometry: `${x.toFixed(3)},${y.toFixed(3)}`,
    geometryType: 'esriGeometryPoint',
    // The layer's own projection. Handed degrees instead, the service
    // reprojects, and on a cold cache that took 44 seconds against 0.4 here.
    inSR: '3086',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'PARCEL_ID,PHY_ADDR1,JV,AV_SD,ASMNT_YR',
    returnGeometry: 'false',
    f: 'json',
  })}`;

  const payload = (await getJson(url, VALUE_TIMEOUT_MS)) as
    | { features?: { attributes?: Record<string, unknown> }[]; error?: unknown }
    | null;

  const attributes = payload?.features?.[0]?.attributes;
  if (!attributes) return null;

  const rollParcelId = str(attributes.PARCEL_ID);
  const rollAddress = str(attributes.PHY_ADDR1);

  const confirmed =
    parcelIdsAgree(parcelId, rollParcelId) ||
    (rollAddress !== null && addressesAgree(address, rollAddress));

  if (!confirmed) return null;

  const assessed = num(attributes.AV_SD);
  const just = num(attributes.JV);
  if (!assessed && !just) return null;

  return {
    // The address the figure is filed under, which on a corner lot is not
    // always the one that was typed.
    address: formatAddressForDisplay(rollAddress ?? address),
    parcelId: rollParcelId,
    assessedValue: assessed,
    justValue: just,
    rollYear: num(attributes.ASMNT_YR),
    sourceName: `${countyName} roll as published by the Florida Department of Revenue`,
    sourceUrl: STATEWIDE_SOURCE_URL,
  };
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
      // The geocoder's coordinate is interpolated along the street centreline,
      // so it points at the road rather than at the roof. Asking the parcel
      // layer about it would answer with the right-of-way parcel or with
      // nothing, so it is not asked.
      valueLookup: null,
    });
  }

  return suggestions;
}

/** Short enough that it cannot be a street address; asking the rolls would waste a query. */
const MIN_QUERY_LENGTH = 5;

/** More than a dropdown can be read at a glance. */
const MAX_SUGGESTIONS = 8;

/** Room kept for each kind of suggestion inside MAX_SUGGESTIONS. */
const MAX_PRICED_SUGGESTIONS = 6;
const MAX_UNPRICED_SUGGESTIONS = 3;

/**
 * How much of the street has to match before a row is worth offering. A prefix
 * of what was typed scores 0.8 and up; sharing three words of four scores
 * 0.375; sharing only the house number scores 0.125.
 */
const MIN_MATCH_SCORE = 0.35;

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

  // Rows are ranked against the street line alone. The city is a separate
  // signal below, and leaving it in the comparison punished the sources that
  // answer with the street and nothing else: "1409 NE 27 Dr, Wilton Manors"
  // matched against "1409 NE 27 DR" would score two thirds rather than one.
  const typedStreet = typed.split(',')[0]?.trim() || typed;

  const results = await Promise.all([
    ...ROLL_SOURCES.map((source) => queryRoll(source, parsed, typedStreet)),
    queryOrangeAddressPoints(parsed, typedStreet),
    queryJacksonvilleGeocoder(typed),
    queryCensus(typed),
  ]);

  const seen = new Map<string, PropertySuggestion[]>();
  const merged: PropertySuggestion[] = [];

  for (const suggestion of results.flat()) {
    // Every source above is addressed by house number, but a geocoder will
    // still answer a street's name with a different number on it. A suggestion
    // at another number is not the property being typed.
    if (parseTypedAddress(suggestion.address).number !== parsed.number) continue;

    // A roll row and a geocoder row for the same house are the same
    // suggestion, and the roll's is the one carrying a figure. Sources that
    // can produce a figure are queried first above, so the first of a pair to
    // arrive here wins. The address is canonicalised for this: one office
    // writes "27 DR" where another writes "27th Drive", and a key that spelled
    // them differently would offer the same house twice, once with a figure
    // and once without.
    //
    // The city is part of the key because one county really can hold the same
    // street address twice — 3301 N University Dr is a real address in both
    // Davie and Sunrise — and collapsing those two would hide a property behind
    // its namesake.
    const key = `${addressKey(suggestion.address)}|${suggestion.countySlug}`.toUpperCase();
    const alreadyShown = seen.get(key) ?? [];

    // One source names the city and another does not — Jacksonville's locator
    // answers "1200 RIVERSIDE AVE, 32204" with no city in it — so a missing
    // city counts as the same place rather than as a different one.
    const duplicate = alreadyShown.some(
      (shown) =>
        !shown.city ||
        !suggestion.city ||
        shown.city.toUpperCase() === suggestion.city.toUpperCase(),
    );
    if (duplicate) continue;

    seen.set(key, [...alreadyShown, suggestion]);
    merged.push(suggestion);
  }

  const ranked = merged
    .map((suggestion) => ({
      suggestion,
      match: scoreAddressMatch(typedStreet, suggestion.address),
      score:
        scoreAddressMatch(typedStreet, suggestion.address) +
        // A suggestion that brings a figure, or can fetch one, is worth more
        // than a better-spelled one that cannot. Typing "400 S Orange Ave"
        // without a city otherwise fills the whole list with exact geocoder
        // matches in five counties and buries the Orlando parcel that would
        // have answered the question.
        (suggestion.assessedValue || suggestion.justValue || suggestion.valueLookup
          ? 0.12
          : 0) +
        // And one whose city is the city they typed is the one they meant.
        (parsed.locality && suggestion.city
          ? suggestion.city.toUpperCase().includes(parsed.locality.toUpperCase())
            ? 0.1
            : 0
          : 0),
    }))
    // A geocoder will answer a street it half recognises — typing 1201 N
    // Orange Ave pulled up 1201 Orangewood Rd, in another county — and a
    // suggestion that shares only the house number with what was typed is
    // noise wherever it sits in the list.
    .filter((entry) => entry.match >= MIN_MATCH_SCORE)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.suggestion);

  // Neither kind of suggestion is allowed to take the whole list.
  //
  // A condominium answers "100 Worth Ave" with thirty units off the roll, each
  // of them a real property and none of them the address that was typed; a
  // common street name answers "400 S Orange Ave" with the same address in
  // five counties, none of which can produce a figure. Sorting alone leaves
  // whichever kind arrived in bulk holding every slot, so each is capped and
  // the other keeps room.
  const chosen: PropertySuggestion[] = [];
  let priced = 0;
  let unpriced = 0;

  for (const suggestion of ranked) {
    if (chosen.length >= MAX_SUGGESTIONS) break;

    const hasFigure = Boolean(
      suggestion.assessedValue || suggestion.justValue || suggestion.valueLookup,
    );

    if (hasFigure && priced >= MAX_PRICED_SUGGESTIONS) continue;
    if (!hasFigure && unpriced >= MAX_UNPRICED_SUGGESTIONS) continue;

    if (hasFigure) priced += 1;
    else unpriced += 1;
    chosen.push(suggestion);
  }

  return chosen;
}
