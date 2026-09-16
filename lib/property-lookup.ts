// Looking an address up on the public tax roll, so the estimator can fill the
// assessed value in instead of asking the reader to go and find it.
//
// Which counties can answer, and how, is in lib/county-rolls.ts. This file is
// the machinery, and what it knows is that a suggestion comes from one of four
// kinds of source:
//
//  1. A COUNTY ROLL WITH THE FIGURES IN IT. The appraiser publishes the
//     certified roll as an open service, address and value in the same row, so
//     the suggestion arrives priced and the figure is that office's own.
//
//  2. A COUNTY ADDRESS SERVICE PLUS THE STATEWIDE ROLL, in two steps. Most
//     counties publish where their addresses are and not what they are worth.
//     A point standing on the property is enough: the Department of Revenue's
//     statewide parcel layer answers "which parcel is at this point" quickly
//     even though it cannot be searched by address at all. So the dropdown
//     comes from the county and the figure is fetched when a property is
//     picked — and only if the parcel found there carries the address picked.
//
//  3. ORANGE AND DUVAL, which are the same idea with their own request shapes:
//     Orange has the property appraiser's address points, Duval the city's
//     address locator, which answers with a key before it answers with a
//     coordinate.
//
//  4. THE CENSUS GEOCODER. Free, keyless, statewide, and knows nothing about
//     value. It covers the remaining counties for the address half of the job
//     and names the county the address is in, which is the thing the
//     place-name guess in lib/florida-places.ts can only approximate. The
//     assessed value there stays a box the reader fills in, with the link to
//     their appraiser next to it, exactly as it was before.
//
// Deliberately not here: a paid aggregator. Every source above is a public
// record published by the office that keeps it, which is what lets the page
// print where a figure came from and link a reader to it. An aggregator would
// cover all 67 counties and none of that would be true.
//
// Why the statewide layer is only ever asked about a point: attribute queries
// against its 10.8 million rows time out at around 55 seconds, so it cannot be
// searched by address, and PARCEL_ID is its one indexed column. Asked which
// parcel covers a coordinate, in its own projection, it answers in well under a
// second. That only helps where the coordinate stands on the property — an
// address point or a parcel's centroid does, and the Census geocoder's, which
// is interpolated along a block and can be two hundred metres out, does not.
import 'server-only';

import { COUNTY_ROLLS, ROLLS_CHECKED_ON, rollFor, type CountyRoll } from './county-rolls';
import { isInFlorida, toFloridaAlbers } from './florida-albers';
import { matchCounty } from './florida-places';
import { site } from './site';

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
  /**
   * A parcel number to read off the statewide roll. The best of the three:
   * PARCEL_ID is the one indexed column on that layer, so it answers in about
   * two seconds, and a parcel number is an identity rather than a guess about
   * where a point fell.
   */
  | { kind: 'parcel'; parcelId: string }
  /** A rooftop coordinate to ask the statewide parcel layer about. */
  | { kind: 'point'; lat: number; lon: number }
  /**
   * One row of a county layer, to be fetched for its geometry. For services
   * too old to hand back a centroid with the search. The county is named
   * rather than its URL sent, so what the browser asks for is a county and a
   * row number and never an address of our server's choosing.
   */
  | { kind: 'county-feature'; countySlug: string; objectId: number }
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
  /** The layer's own row number, for fetching that row's geometry later. */
  objectId: number | null;
  city: string | null;
  zip: string | null;
  parcelId: string | null;
  assessedValue: number | null;
  justValue: number | null;
  rollYear: number | null;
  useDescription: string | null;
}

/** The date the machinery below was last checked; the registry carries its own. */
export const ROLL_SOURCES_CHECKED_ON = ROLLS_CHECKED_ON;

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

/** Every column an entry names, which is what a query asks the service for. */
export function outFieldsOf(roll: CountyRoll): string[] {
  const address =
    roll.address.kind === 'line'
      ? [roll.address.field, roll.address.unitField]
      : [
          roll.address.numberField,
          roll.address.directionField,
          roll.address.nameField,
          roll.address.typeField,
          roll.address.unitField,
        ];

  return [
    ...address,
    roll.assessedField,
    roll.justField,
    ...(roll.justParts ?? []),
    roll.yearField,
    roll.parcelField,
    roll.cityField,
    roll.zipField,
    roll.useField,
  ].filter((field): field is string => Boolean(field));
}

/**
 * The where clause for one roll, or null where the typed text cannot address it.
 *
 * A house number is required by every entry. Without one a roll query returns
 * the first two thousand rows of a street and the reader learns nothing, so the
 * estimator waits rather than guesses.
 */
export function whereFor(roll: CountyRoll, parsed: TypedAddress): string | null {
  const clauses: string[] = [];

  if (roll.address.kind === 'parts') {
    if (!parsed.number || parsed.street.length === 0) return null;
    clauses.push(`${roll.address.numberField} = '${sql(parsed.number)}'`);
    if (parsed.directional && roll.address.directionField) {
      clauses.push(`${roll.address.directionField} = '${sql(parsed.directional)}'`);
    }
    // The street name is matched as a prefix because "48" has to find "48" and
    // nothing else has to be typed exactly.
    clauses.push(`${roll.address.nameField} LIKE '${sql(parsed.street[0])}%'`);
  } else {
    const prefix = rollAddressPrefix(parsed, { dropStreetType: roll.address.spellsTypeOut });
    if (!prefix) return null;
    // UPPER() rather than trusting a collation: these are sixty services kept
    // by sixty offices, and some of them compare case-sensitively.
    clauses.push(`UPPER(${roll.address.field}) LIKE '${sql(prefix)}%'`);
  }

  if (roll.filter) clauses.push(`(${roll.filter})`);

  return clauses.join(' AND ');
}

/** One row off a roll, in the shape every source is read into. */
export function readRow(roll: CountyRoll, a: Record<string, unknown>): RollRow | null {
  const address =
    roll.address.kind === 'line'
      ? [str(a[roll.address.field]), roll.address.unitField ? str(a[roll.address.unitField]) : null]
          .filter(Boolean)
          .join(' ')
      : [
          str(a[roll.address.numberField]),
          roll.address.directionField ? str(a[roll.address.directionField]) : null,
          str(a[roll.address.nameField]),
          roll.address.typeField ? str(a[roll.address.typeField]) : null,
          roll.address.unitField ? str(a[roll.address.unitField]) : null,
        ]
          .filter(Boolean)
          .join(' ');

  if (!address) return null;

  const use = roll.useField ? str(a[roll.useField]) : null;
  if (use && roll.excludeUse?.some((excluded) => use.toUpperCase() === excluded)) return null;

  const justFromParts = (roll.justParts ?? []).reduce(
    (running, field) => running + (num(a[field]) ?? 0),
    0,
  );

  const cityRaw = roll.cityField ? str(a[roll.cityField]) : null;

  return {
    address,
    objectId: num(a.OBJECTID) ?? num(a.FID) ?? num(a.OBJECTID_1),
    // A city code that is not in the table is left off rather than printed raw:
    // "WM" under an address helps nobody.
    city: cityRaw && roll.cityCodes ? (roll.cityCodes[cityRaw] ?? null) : cityRaw,
    zip: roll.zipField ? zip5(a[roll.zipField]) : null,
    parcelId: roll.parcelField ? str(a[roll.parcelField]) : null,
    assessedValue: roll.assessedField ? num(a[roll.assessedField]) : null,
    justValue: roll.justField ? num(a[roll.justField]) : justFromParts > 0 ? justFromParts : null,
    rollYear: roll.yearField ? num(a[roll.yearField]) : null,
    useDescription: use,
  };
}

/**
 * Counties where picking an address produces a figure — either because the
 * roll carried it in the row, or because the parcel under the address can be
 * found and read on the statewide layer.
 */
export const VALUE_COUNTIES: { slug: string; name: string }[] = [
  ...COUNTY_ROLLS.map((roll) => ({ slug: roll.countySlug, name: roll.countyName })),
  { slug: 'orange-county', name: 'Orange County' },
  { slug: 'duval-county', name: 'Duval County' },
].sort((a, b) => a.name.localeCompare(b.name));

export const VALUE_COUNTY_SLUGS = VALUE_COUNTIES.map((county) => county.slug);

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

/** Exported for the live registry check in tests/rolls.live.test.ts. */
export async function queryRoll(
  roll: CountyRoll,
  parsed: TypedAddress,
  typed: string,
): Promise<PropertySuggestion[]> {
  const where = whereFor(roll, parsed);
  if (!where) return [];

  const url = `${roll.serviceUrl}?${new URLSearchParams({
    where,
    outFields: outFieldsOf(roll).join(','),
    // An address point layer is already the point; anything with an outline is
    // asked for its centroid, which is inside the parcel. Either way the point
    // is what makes the statewide roll answerable — it cannot land on the road
    // the way a geocoded address does — and it is asked for even where the
    // county publishes its own figures, because a row with the value missing
    // is common and can still be priced from the state's roll.
    returnGeometry: roll.figures === 'point' ? 'true' : 'false',
    ...(roll.figures === 'point'
      ? { outSR: '4326' }
      : roll.figures === 'centroid' || roll.centroidOnSearch
        ? { returnCentroid: 'true', outSR: '4326' }
        : {}),
    resultRecordCount: String(ROWS_PER_SOURCE),
    f: 'json',
  })}`;

  const payload = (await getJson(url)) as
    | {
        features?: {
          attributes?: Record<string, unknown>;
          centroid?: { x?: number; y?: number };
          geometry?: { x?: number; y?: number };
        }[];
        error?: unknown;
      }
    | null;

  if (!payload || payload.error || !Array.isArray(payload.features)) return [];

  const suggestions: PropertySuggestion[] = [];

  for (const feature of payload.features) {
    const row = feature.attributes ? readRow(roll, feature.attributes) : null;
    if (!row) continue;
    if (scoreAddressMatch(typed, row.address) <= 0) continue;

    suggestions.push({
      id: `${roll.countySlug}:${row.parcelId ?? row.address}`,
      address: formatAddressForDisplay(row.address),
      city: row.city ? formatPlaceForDisplay(row.city) : null,
      zip: row.zip,
      countySlug: roll.countySlug,
      countyName: roll.countyName,
      parcelId: row.parcelId,
      assessedValue: row.assessedValue,
      justValue: row.justValue,
      rollYear: row.rollYear,
      useDescription: row.useDescription ? formatPlaceForDisplay(row.useDescription) : null,
      sourceName: roll.sourceName ?? `${roll.countyName} address records`,
      sourceUrl: roll.sourceUrl ?? STATEWIDE_SOURCE_URL,
      // Where the county's own layer carries the figures there is nothing
      // further to ask. Where it does not, the figures come off the statewide
      // roll when somebody picks the property — at the parcel's centroid, by
      // its number, or by fetching the one row's geometry, in that order of
      // preference and of certainty.
      valueLookup: lookupFor(roll, row, feature.centroid ?? feature.geometry),
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

const STATEWIDE_OUT_FIELDS = 'PARCEL_ID,PHY_ADDR1,JV,AV_SD,ASMNT_YR';

/** Which parcel covers this point. Fast only in the layer's own projection. */
async function parcelAtPoint(
  point: { lat: number; lon: number } | null,
): Promise<Record<string, unknown> | null> {
  if (!point || !isInFlorida(point.lon, point.lat)) return null;

  const { x, y } = toFloridaAlbers(point.lon, point.lat);

  const url = `${STATEWIDE_PARCELS}?${new URLSearchParams({
    geometry: `${x.toFixed(3)},${y.toFixed(3)}`,
    geometryType: 'esriGeometryPoint',
    // The layer's own projection. Handed degrees instead, the service
    // reprojects, and on a cold cache that took 44 seconds against 0.4 here.
    inSR: '3086',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: STATEWIDE_OUT_FIELDS,
    returnGeometry: 'false',
    f: 'json',
  })}`;

  const payload = (await getJson(url, VALUE_TIMEOUT_MS)) as
    | { features?: { attributes?: Record<string, unknown> }[]; error?: unknown }
    | null;

  return payload?.features?.[0]?.attributes ?? null;
}

/**
 * The parcel with this number, read off the statewide roll.
 *
 * PARCEL_ID is the only column on that layer with an index behind it — an
 * address search times out at 55 seconds where this answers in two — which is
 * what makes a county service that publishes nothing but addresses and parcel
 * numbers enough to price a property.
 *
 * The counties do not all write the number the same way the Department of
 * Revenue does. Punctuation is dropped, and where that finds nothing the
 * section-township-range reordering Orange County uses is tried as well.
 */
async function parcelById(parcelId: string): Promise<Record<string, unknown> | null> {
  const plain = parcelId.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (plain.length < 5) return null;

  const reordered =
    plain.length >= 7
      ? plain.slice(4, 6) + plain.slice(2, 4) + plain.slice(0, 2) + plain.slice(6)
      : null;

  for (const candidate of reordered && reordered !== plain ? [plain, reordered] : [plain]) {
    const url = `${STATEWIDE_PARCELS}?${new URLSearchParams({
      where: `PARCEL_ID = '${sql(candidate)}'`,
      outFields: STATEWIDE_OUT_FIELDS,
      returnGeometry: 'false',
      resultRecordCount: '1',
      f: 'json',
    })}`;

    const payload = (await getJson(url, VALUE_TIMEOUT_MS)) as
      | { features?: { attributes?: Record<string, unknown> }[]; error?: unknown }
      | null;

    const attributes = payload?.features?.[0]?.attributes;
    if (attributes) return attributes;
  }

  return null;
}

/**
 * The middle of one row of a county layer.
 *
 * Older ArcGIS Servers will not return a centroid with a search, so the
 * geometry of the single row somebody picked is fetched here instead — one
 * parcel's outline rather than twenty-five of them on every keystroke. The
 * average of the outline's corners is inside any parcel that is not badly
 * concave, and a point that lands outside one fails the address check further
 * down rather than answering with a neighbour's figure.
 */
async function countyFeaturePoint(
  countySlug: string,
  objectId: number,
): Promise<{ lat: number; lon: number } | null> {
  const roll = rollFor(countySlug);
  if (!roll || !Number.isInteger(objectId)) return null;

  const url = `${roll.serviceUrl}?${new URLSearchParams({
    objectIds: String(objectId),
    outFields: 'OBJECTID',
    returnGeometry: 'true',
    outSR: '4326',
    resultRecordCount: '1',
    f: 'json',
  })}`;

  const payload = (await getJson(url, VALUE_TIMEOUT_MS)) as
    | {
        features?: {
          geometry?: { rings?: number[][][]; x?: number; y?: number };
        }[];
      }
    | null;

  const geometry = payload?.features?.[0]?.geometry;
  if (!geometry) return null;

  if (typeof geometry.x === 'number' && typeof geometry.y === 'number') {
    return isInFlorida(geometry.x, geometry.y) ? { lat: geometry.y, lon: geometry.x } : null;
  }

  const ring = (geometry.rings ?? []).reduce(
    (longest: number[][], candidate) => (candidate.length > longest.length ? candidate : longest),
    [] as number[][],
  );
  if (ring.length === 0) return null;

  const lon = ring.reduce((total, point) => total + point[0], 0) / ring.length;
  const lat = ring.reduce((total, point) => total + point[1], 0) / ring.length;

  return isInFlorida(lon, lat) ? { lat, lon } : null;
}

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
  const attributes =
    lookup.kind === 'parcel'
      ? await parcelById(lookup.parcelId)
      : await parcelAtPoint(
          lookup.kind === 'point'
            ? { lat: lookup.lat, lon: lookup.lon }
            : lookup.kind === 'county-feature'
              ? await countyFeaturePoint(lookup.countySlug, lookup.objectId)
              : await jacksonvillePoint(lookup.magicKey),
        );

  if (!attributes) return null;

  const rollParcelId = str(attributes.PARCEL_ID);
  const rollAddress = str(attributes.PHY_ADDR1);

  // A parcel number is an identity: the row that came back is the parcel that
  // was asked for, and nothing further has to agree. The other two lookups
  // found a parcel by where it is, so they have to prove it is the right one.
  const confirmed =
    lookup.kind === 'parcel' ||
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

/** What a suggestion carries so its figures can be fetched when it is picked. */
function lookupFor(
  roll: CountyRoll,
  row: RollRow,
  centroid?: { x?: number; y?: number },
): ValueLookup | null {
  if (row.assessedValue || row.justValue) return null;

  if (typeof centroid?.x === 'number' && typeof centroid?.y === 'number') {
    return isInFlorida(centroid.x, centroid.y)
      ? { kind: 'point', lat: centroid.y, lon: centroid.x }
      : null;
  }

  // A parcel number is an identity where the Department of Revenue writes it
  // the same way the county does, which is not everywhere: Lee County's STRAP
  // and the state's number for the same parcel share no digits. So it is used
  // where a county has been checked and found to agree, and the geometry of
  // the row is the fallback everywhere else.
  if (roll.figures !== 'centroid' && row.parcelId && roll.parcelIsStatewide) {
    return { kind: 'parcel', parcelId: row.parcelId };
  }

  if (roll.figures === 'feature' && row.objectId !== null) {
    return { kind: 'county-feature', countySlug: roll.countySlug, objectId: row.objectId };
  }

  return null;
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
 * The counties asked on every keystroke, whatever the address says.
 *
 * Sixty-odd rolls cannot all be asked at once — that is sixty requests a
 * keystroke to other offices' services, which would be rude if it were not
 * first slow. These are the counties this office works in, so they are the
 * ones worth a standing question; everywhere else waits for the geocoder to
 * name a county, one hop later. See searchProperties.
 */
const ALWAYS_ASKED: string[] = site.priorityCounties.map(
  (name) => `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
);

/**
 * Whether somebody has finished typing an address, near enough: a city after a
 * comma, a ZIP, or a house number and three more words.
 */
function looksComplete(typed: string): boolean {
  if (typed.includes(',') || /\b\d{5}\b/.test(typed)) return true;
  return typed.trim().split(/\s+/).length >= 4;
}

/** Every source that can answer for one county, roll or address service. */
function sourcesFor(
  countySlug: string,
  parsed: TypedAddress,
  typedStreet: string,
  typed: string,
): Promise<PropertySuggestion[]>[] {
  const work: Promise<PropertySuggestion[]>[] = [];

  const roll = rollFor(countySlug);
  if (roll) work.push(queryRoll(roll, parsed, typedStreet));

  // The two counties that publish where their addresses are but not what they
  // are worth; the figure follows when a property is picked.
  if (countySlug === 'orange-county') work.push(queryOrangeAddressPoints(parsed, typedStreet));
  if (countySlug === 'duval-county') work.push(queryJacksonvilleGeocoder(typed));

  return work;
}

/**
 * What the estimator's address box offers while somebody types.
 *
 * It goes in two waves, and the first one is as wide as it can afford to be.
 * The counties this office works in are asked outright, at the same time as
 * the Census geocoder — the rolls are the better answer where they exist, the
 * geocoder is the only answer everywhere else, and waiting for either would
 * put the slower on the end of the faster. The geocoder also names the county
 * the address is in, which is what the second wave is for: an address in one
 * of the other sixty counties gets its own roll asked on the strength of that,
 * one hop later. It is the price of not asking sixty services per keystroke.
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

  // A place name in the address is a county without asking anybody, so the
  // county it names joins the first wave.
  const guessed = matchCounty(typed)?.countySlug;
  const asked = new Set(guessed ? [...ALWAYS_ASKED, guessed] : ALWAYS_ASKED);

  const censusWork = queryCensus(typed);
  const firstWave = await Promise.all(
    [...asked].flatMap((countySlug) => sourcesFor(countySlug, parsed, typedStreet, typed)),
  );

  const census = await censusWork;
  const secondWave = await Promise.all(
    [...new Set(census.map((suggestion) => suggestion.countySlug))]
      .filter((countySlug) => !asked.has(countySlug))
      .flatMap((countySlug) => {
        asked.add(countySlug);
        return sourcesFor(countySlug, parsed, typedStreet, typed);
      }),
  );

  // Last resort, and only for an address that looks finished: the geocoder
  // cannot place a house in a subdivision built since its last street file, so
  // an address the first two waves both missed gets put to every county that
  // keeps a roll. It is the one case worth the requests, because the reader has
  // typed the whole thing and been given nothing.
  const found = [...firstWave, ...secondWave].flat();
  const lastWave =
    found.length === 0 && looksComplete(typed)
      ? await Promise.all(
          COUNTY_ROLLS.filter((roll) => !asked.has(roll.countySlug)).map((roll) =>
            queryRoll(roll, parsed, typedStreet),
          ),
        )
      : [];

  // The geocoder's rows go last, so that where a county and the geocoder
  // describe the same house it is the county's row — the one that can produce
  // a figure — that survives the deduplication below.
  const results = [...firstWave, ...secondWave, ...lastWave, census];

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
