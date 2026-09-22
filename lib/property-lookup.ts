// Looking an address up on the public tax roll, so the estimator can fill the
// value in instead of asking the reader to go and find it.
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
//     value there stays a box the reader fills in, with the link to their
//     appraiser next to it, exactly as it was before.
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
import { countyByCode, countyByName } from './florida-counties';
import { geocodeSuggestion, geocoderConfigured, suggestAddresses } from './geocoder';
import { matchCounty } from './florida-places';
import { fetchLookupJson } from './lookup-fetch';
import { site } from './site';

import {
  addressKey,
  addressesAgree,
  formatAddressForDisplay,
  formatPlaceForDisplay,
  namesAnotherState,
  normalizeForMatch,
  parseTypedAddress,
  prefixVariants,
  rollAddressPrefix,
  scoreAddressMatch,
  unitPatterns,
  type TypedAddress,
} from './address-format';

/** A sale as the roll records it: the price, and the year it was recorded in. */
export interface RecordedSale {
  price: number;
  year: number;
}

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
  /** Whether the roll counts it as a homestead; null where the roll does not say. */
  homestead: boolean | null;
  /** The most recent sale the roll records, where it records one at a real price. */
  lastSale: RecordedSale | null;
  /** Named and linked under the figure, because an unsourced number is a rumour. */
  sourceName: string;
  sourceUrl: string;
  /**
   * Set where the values are a second request away rather than in hand, and
   * null where there is nothing further to ask. See resolveParcelValue.
   */
  valueLookup: ValueLookup | null;
}

/**
 * A suggestion as the browser receives it: with the lookup signed, so that
 * /api/parcel-value runs only lookups this site handed out. See
 * lib/lookup-guard.ts.
 */
export interface OfferedSuggestion extends PropertySuggestion {
  lookupToken: string | null;
}

/** How a suggestion's figures are fetched once somebody picks it. */
export type ValueLookup =
  /** A rooftop coordinate to ask the statewide parcel layer about. */
  | { kind: 'point'; lat: number; lon: number }
  /** Jacksonville's geocoder answers with a key first and a coordinate second. */
  | { kind: 'jacksonville'; magicKey: string }
  /**
   * The statewide geocoder's handle for a suggestion, spent when it is picked,
   * with the suggestion's own text, which Esri asks to have back alongside it.
   * Only where a key is configured; see lib/geocoder.ts.
   */
  | { kind: 'esri'; magicKey: string; text: string };

/**
 * How a lookup ended, which the page says different things about.
 *
 * 'declined' and 'unavailable' both leave the box empty and are not the same
 * thing: the first is the roll answering that the parcel under that point is
 * not the property that was picked, which is the check working; the second is
 * the roll not answering at all, which is a slow afternoon on somebody else's
 * server and worth trying again. A decline for 'which-unit' is the roll
 * answering with a building of condominiums when no unit was picked, which
 * the reader can fix by saying which.
 */
export type ParcelValueResult =
  | { status: 'found'; value: ParcelValue }
  | { status: 'declined'; reason: 'mismatch' | 'which-unit' }
  | { status: 'unavailable' };

/** What a lookup comes back with: the figures, and where they are from. */
export interface ParcelValue {
  address: string;
  /**
   * The county the parcel is in, read off the roll rather than taken from the
   * suggestion: a statewide geocoder's suggestion does not know one until it
   * has been resolved, and this is where it learns.
   */
  countySlug: string | null;
  countyName: string | null;
  parcelId: string | null;
  assessedValue: number | null;
  justValue: number | null;
  rollYear: number | null;
  homestead: boolean | null;
  lastSale: RecordedSale | null;
  sourceName: string;
  sourceUrl: string;
}

/**
 * What the address box is offered, and whether "nothing" can be believed.
 *
 * 'unavailable' is an empty list with a service behind it that did not
 * answer, so the property may well be there; 'outside-florida' is an address
 * that says it is somewhere this office cannot insure.
 */
export interface PropertySearch {
  suggestions: PropertySuggestion[];
  status: 'ok' | 'unavailable' | 'outside-florida';
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
  homestead: boolean | null;
  lastSale: RecordedSale | null;
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

/** A Y/N flag, or an exemption amount that is more than nothing on a homestead. */
function readHomestead(value: unknown): boolean | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value > 0;
  const flag = str(value)?.toUpperCase();
  return flag === 'Y' ? true : flag === 'N' ? false : null;
}

/** Epoch milliseconds off an ArcGIS date column, or "20221129" off Miami-Dade's. */
function saleYear(value: unknown): number | null {
  const year =
    typeof value === 'number'
      ? new Date(value).getUTCFullYear()
      : Number(/^(\d{4})\d{4}$/.exec(str(value) ?? '')?.[1]);
  return Number.isInteger(year) && year >= 1900 && year <= new Date().getUTCFullYear() + 1
    ? year
    : null;
}

/**
 * Below this a recorded sale is a deed for nominal consideration — ten
 * dollars, a hundred — which is how a transfer into a trust or between
 * spouses is written, and says nothing about what the house is worth.
 */
const NOMINAL_SALE = 1_000;

function recordedSale(price: unknown, year: number | null): RecordedSale | null {
  const amount = num(price);
  return amount !== null && amount >= NOMINAL_SALE && year !== null ? { price: amount, year } : null;
}

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
    roll.homesteadField,
    roll.saleDateField,
    roll.salePriceField,
  ].filter((field): field is string => Boolean(field));
}

const anyOf = (clauses: string[]) =>
  clauses.length === 1 ? clauses[0] : `(${clauses.join(' OR ')})`;

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
    // nothing else has to be typed exactly. An O'Brien is two tokens by now
    // and is asked for as one name.
    const [first, second] = parsed.street;
    const name = first === 'O' && second ? `O ${second}` : first;
    const field = roll.address.nameField;
    clauses.push(anyOf(prefixVariants(sql(name)).map((variant) => `${field} LIKE '${variant}%'`)));
  } else {
    const prefix = rollAddressPrefix(parsed, { dropStreetType: roll.address.spellsTypeOut });
    if (!prefix) return null;
    // UPPER() rather than trusting a collation: these are sixty services kept
    // by sixty offices, and some of them compare case-sensitively.
    const field = roll.address.field;
    clauses.push(
      anyOf(prefixVariants(sql(prefix)).map((variant) => `UPPER(${field}) LIKE '${variant}%'`)),
    );
  }

  return clauses.join(' AND ');
}

/**
 * The clause that narrows a roll to the unit typed, or null where none was.
 *
 * Asked as a second query beside the plain one rather than instead of it: a
 * roll of address points may not carry units at all, and one that files the
 * building and not the units would otherwise answer nothing. The narrowed
 * query is the one that reaches unit 1401 of a tower whose first
 * twenty-five rows are units 1 to 25.
 */
export function unitWhereFor(roll: CountyRoll, parsed: TypedAddress): string | null {
  if (!parsed.unit) return null;
  const unit = sql(parsed.unit);

  const unitField = roll.address.unitField;
  if (unitField) {
    // Broward pads its unit column with spaces, so "101" is stored "101  ".
    return anyOf([
      `UPPER(${unitField}) = '${unit}'`,
      `UPPER(${unitField}) LIKE '${unit} %'`,
      `UPPER(${unitField}) LIKE '% ${unit}'`,
    ]);
  }

  if (roll.address.kind !== 'line') return null;
  const field = roll.address.field;
  return anyOf(unitPatterns(unit).map((pattern) => `UPPER(${field}) LIKE '${pattern}'`));
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
    // A city code that is not in the table is left off rather than printed raw:
    // "WM" under an address helps nobody.
    city: cityRaw && roll.cityCodes ? (roll.cityCodes[cityRaw] ?? null) : cityRaw,
    zip: roll.zipField ? zip5(a[roll.zipField]) : null,
    parcelId: roll.parcelField ? str(a[roll.parcelField]) : null,
    assessedValue: roll.assessedField ? num(a[roll.assessedField]) : null,
    justValue: roll.justField ? num(a[roll.justField]) : justFromParts > 0 ? justFromParts : null,
    rollYear: roll.yearField ? num(a[roll.yearField]) : null,
    useDescription: use,
    homestead: roll.homesteadField ? readHomestead(a[roll.homesteadField]) : null,
    lastSale:
      roll.saleDateField && roll.salePriceField
        ? recordedSale(a[roll.salePriceField], saleYear(a[roll.saleDateField]))
        : null,
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
 * One search's deadline, and a count of the services that did not answer it —
 * which is the difference between "no property found" and "we could not ask".
 */
interface SearchContext {
  signal?: AbortSignal;
  failures: number;
}

async function getJson(
  url: string,
  search: SearchContext | null,
  options: { timeoutMs?: number; cacheable?: boolean; signal?: AbortSignal } = {},
): Promise<unknown | null> {
  const body = await fetchLookupJson(url, {
    timeoutMs: options.timeoutMs ?? UPSTREAM_TIMEOUT_MS,
    signal: options.signal ?? search?.signal,
    cacheable: options.cacheable ?? true,
    label: 'property-lookup',
  });
  if (body === null && search) search.failures += 1;
  return body;
}

/** How many rows a single roll is asked for before scoring narrows them down. */
const ROWS_PER_SOURCE = 25;

type RollPayload = {
  features?: {
    attributes?: Record<string, unknown>;
    centroid?: { x?: number; y?: number };
    geometry?: { x?: number; y?: number };
  }[];
};

/** Exported for the live registry check in tests/rolls.live.test.ts. */
export async function queryRoll(
  roll: CountyRoll,
  parsed: TypedAddress,
  typed: string,
  search: SearchContext | null = null,
): Promise<PropertySuggestion[]> {
  const where = whereFor(roll, parsed);
  if (!where) return [];

  const unitWhere = unitWhereFor(roll, parsed);
  const wheres = unitWhere ? [`${where} AND ${unitWhere}`, where] : [where];

  const payloads = await Promise.all(
    wheres.map(
      (clause) =>
        getJson(
          `${roll.serviceUrl}?${new URLSearchParams({
            where: clause,
            outFields: outFieldsOf(roll).join(','),
            // An address point layer is already the point; anything with an
            // outline is asked for its centroid, which is inside the parcel.
            // Either way the point is what makes the statewide roll
            // answerable — it cannot land on the road the way a geocoded
            // address does — and it is asked for even where the county
            // publishes its own figures, because a row with the value missing
            // is common and can still be priced from the state's roll.
            returnGeometry: roll.figures === 'point' ? 'true' : 'false',
            ...(roll.figures === 'point'
              ? { outSR: '4326' }
              : roll.figures === 'centroid' || roll.centroidOnSearch
                ? { returnCentroid: 'true', outSR: '4326' }
                : {}),
            // In address order, so which twenty-five rows of a large building
            // come back is the same every time rather than the layer's whim.
            ...(roll.address.kind === 'line' ? { orderByFields: roll.address.field } : {}),
            resultRecordCount: String(ROWS_PER_SOURCE),
            f: 'json',
          })}`,
          search,
        ) as Promise<RollPayload | null>,
    ),
  );

  const suggestions: PropertySuggestion[] = [];
  const seen = new Set<string>();

  for (const feature of payloads.flatMap((payload) => payload?.features ?? [])) {
    const row = feature.attributes ? readRow(roll, feature.attributes) : null;
    if (!row) continue;
    if (scoreAddressMatch(typed, row.address) <= 0) continue;

    const id = `${roll.countySlug}:${row.parcelId ?? row.address}`;
    if (seen.has(id)) continue;
    seen.add(id);

    suggestions.push({
      id,
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
      homestead: row.homestead,
      lastSale: row.lastSale,
      sourceName: roll.sourceName ?? `${roll.countyName} address records`,
      sourceUrl: roll.sourceUrl ?? STATEWIDE_SOURCE_URL,
      // Where the county's own layer carries the figures there is nothing
      // further to ask. Where it does not, the figures come off the statewide
      // roll at the parcel's centroid when somebody picks the property.
      valueLookup: lookupFor(row, feature.centroid ?? feature.geometry),
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
  search: SearchContext,
): Promise<PropertySuggestion[]> {
  // This source spells street types out — "1409 E Esther Street" — so the
  // prefix stops before the type. "Trl" is not the start of "Trail".
  const prefix = rollAddressPrefix(parsed, { dropStreetType: true });
  if (!prefix) return [];

  const where = `${anyOf(
    prefixVariants(sql(prefix)).map((variant) => `UPPER(COMPLETE_ADDRESS) LIKE '${variant}%'`),
  )} AND ADDRESS_STATUS = 'Active'`;
  // The unit is written into the address here — "2484 San Tecla Street UNIT
  // 105" — as well as into a column of its own.
  const unitWhere = parsed.unit
    ? anyOf(unitPatterns(sql(parsed.unit)).map((pattern) => `UPPER(COMPLETE_ADDRESS) LIKE '${pattern}'`))
    : null;

  const payloads = await Promise.all(
    (unitWhere ? [`${where} AND ${unitWhere}`, where] : [where]).map(
      (clause) =>
        getJson(
          `${ORANGE_ADDRESS_POINTS}?${new URLSearchParams({
            where: clause,
            outFields:
              'OFFICIAL_PARCEL_ID,COMPLETE_ADDRESS,UNIT,MUNICIPAL_JURISDICTION,ZIPCODE,LATITUDE,LONGITUDE',
            returnGeometry: 'false',
            orderByFields: 'COMPLETE_ADDRESS',
            resultRecordCount: String(ROWS_PER_SOURCE),
            f: 'json',
          })}`,
          search,
        ) as Promise<{ features?: { attributes?: Record<string, unknown> }[] } | null>,
    ),
  );

  const suggestions: PropertySuggestion[] = [];
  const seen = new Set<string>();

  for (const feature of payloads.flatMap((payload) => payload?.features ?? [])) {
    const a = feature.attributes ?? {};
    const street = str(a.COMPLETE_ADDRESS);
    const unit = str(a.UNIT);
    // Most points carry the unit in both columns, and printing both put it on
    // the line twice.
    const address =
      street && unit && !street.toUpperCase().endsWith(unit.toUpperCase())
        ? `${street} ${unit}`
        : (street ?? unit);
    const latitude = typeof a.LATITUDE === 'number' ? a.LATITUDE : null;
    const longitude = typeof a.LONGITUDE === 'number' ? a.LONGITUDE : null;

    if (!address || scoreAddressMatch(typed, address) <= 0) continue;

    const id = `orange-county:${str(a.OFFICIAL_PARCEL_ID) ?? address}`;
    if (seen.has(id)) continue;
    seen.add(id);

    const city = str(a.MUNICIPAL_JURISDICTION);

    suggestions.push({
      id,
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
      homestead: null,
      lastSale: null,
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

async function queryJacksonvilleGeocoder(
  typed: string,
  search: SearchContext,
): Promise<PropertySuggestion[]> {
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

  const payload = (await getJson(url, search)) as
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
      homestead: null,
      lastSale: null,
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

/**
 * The second attempt, which is the one that usually lands: the request that
 * timed out on this end went on to warm the service's cache on the other.
 */
const VALUE_RETRY_TIMEOUT_MS = 20_000;

/**
 * JV_HMSTD is the just value of the parcel's homestead portion, which is more
 * than nothing only on a homestead; DOR_UC 004 is a condominium unit.
 */
const STATEWIDE_OUT_FIELDS =
  'PARCEL_ID,PHY_ADDR1,JV,AV_SD,ASMNT_YR,CO_NO,DOR_UC,JV_HMSTD,SALE_PRC1,SALE_YR1';

/**
 * The roll did not answer, as distinct from answering that there is no parcel
 * at that point. Its first query about a place can take longer than anybody
 * will wait, and telling a reader we could not confirm their address when the
 * truth is that a server was slow sends them off to look up a figure they
 * would have been given.
 */
const UNAVAILABLE = Symbol('statewide roll did not answer');

/**
 * Every parcel covering this point. Fast only in the layer's own projection.
 *
 * Every, rather than the first: a condominium is a stack of identical
 * outlines, one per unit, and the first of them is whichever unit the layer
 * happens to list first. chooseParcel decides which one was asked about.
 */
async function parcelsAtPoint(
  point: { lat: number; lon: number } | null,
  options: { cacheable: boolean; signal?: AbortSignal },
): Promise<Record<string, unknown>[] | typeof UNAVAILABLE> {
  if (!point || !isInFlorida(point.lon, point.lat)) return UNAVAILABLE;

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

  // Twice, when the first attempt does not answer at all.
  //
  // The statewide layer is slow the first time it is asked about a place and
  // quick every time after — 44 seconds against 0.4 in testing — because the
  // request that timed out on this end went on to warm the service's cache on
  // the other. Distinguishing "no answer" from "no parcel there" matters: an
  // empty feature list is an answer, and asking again would waste the reader's
  // time to be told the same thing.
  for (const timeoutMs of [VALUE_TIMEOUT_MS, VALUE_RETRY_TIMEOUT_MS]) {
    if (options.signal?.aborted) break;
    const payload = (await getJson(url, null, { timeoutMs, ...options })) as
      | { features?: { attributes?: Record<string, unknown> }[] }
      | null;

    if (payload) {
      return (payload.features ?? []).flatMap((feature) =>
        feature.attributes ? [feature.attributes] : [],
      );
    }
  }

  return UNAVAILABLE;
}

async function jacksonvillePoint(
  magicKey: string,
  signal?: AbortSignal,
): Promise<{ lat: number; lon: number } | null> {
  const url = `${JACKSONVILLE_GEOCODER}/findAddressCandidates?${new URLSearchParams({
    magicKey,
    outSR: '4326',
    maxLocations: '1',
    f: 'json',
  })}`;

  const payload = (await getJson(url, null, { signal })) as
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

/** The Department of Revenue's use code for a residential condominium unit. */
const CONDOMINIUM_UNIT = '004';

export type ParcelChoice =
  | { status: 'chosen'; attributes: Record<string, unknown> }
  | { status: 'declined'; reason: 'mismatch' | 'which-unit' };

/**
 * Which of the parcels at a point is the property that was picked, if any.
 *
 * The parcel is found by where it is, so something has to confirm it is the
 * right parcel. Two things can: the parcel number, where the county's address
 * service published one, or failing that the address on the row. A point that
 * lands on a right-of-way strip, a condominium's parent parcel or the lot next
 * door satisfies neither, and an empty box with the appraiser's link beside it
 * is the honest outcome.
 *
 * The parcel number is the better of the two and the reason it is tried first:
 * a corner lot is filed by the county under one of its streets and by the
 * Department of Revenue under the other — 1409 E Esther Street in Orlando is
 * 1919 Pine Bluff Ave on the state roll, one parcel with two front doors — and
 * on the address alone this would decline a figure it has every reason to be
 * sure of.
 *
 * A condominium is where the address alone is not enough. Its units share a
 * street address and a footprint, so a point on the building finds every unit
 * in it: the unit picked is taken where it is among them, and where no unit
 * was picked there is no telling which one is meant, so the answer is to ask.
 */
export function chooseParcel(
  rows: Record<string, unknown>[],
  picked: { address: string; parcelId: string | null; geocodedAddress: string | null },
): ParcelChoice {
  const byNumber = rows.find((row) => parcelIdsAgree(picked.parcelId, str(row.PARCEL_ID)));
  if (byNumber) return { status: 'chosen', attributes: byNumber };

  const spellings = [picked.address, picked.geocodedAddress].filter(
    (spelling): spelling is string => Boolean(spelling),
  );

  const agreeing: Record<string, unknown>[] = [];
  const parcels = new Set<string>();
  for (const row of rows) {
    const rollAddress = str(row.PHY_ADDR1);
    if (!rollAddress || !spellings.some((spelling) => addressesAgree(spelling, rollAddress))) continue;
    const parcel = str(row.PARCEL_ID) ?? rollAddress;
    if (parcels.has(parcel)) continue;
    parcels.add(parcel);
    agreeing.push(row);
  }

  if (agreeing.length === 0) return { status: 'declined', reason: 'mismatch' };

  const unitOf = (raw: string | null) => (raw ? parseTypedAddress(raw).unit : null);
  const wantedUnit = spellings.map(unitOf).find(Boolean) ?? null;
  const isCondominiumUnit = (row: Record<string, unknown>) => str(row.DOR_UC) === CONDOMINIUM_UNIT;

  if (wantedUnit) {
    const exact = agreeing.filter((row) => unitOf(str(row.PHY_ADDR1)) === wantedUnit);
    if (exact.length === 1) return { status: 'chosen', attributes: exact[0] };

    // The unit is not on the roll as a parcel of its own. One building filed
    // as one parcel — a duplex, a house with an apartment — is still the front
    // door that was picked; a condominium unit filed under another number is
    // not.
    const whole = agreeing.filter((row) => !unitOf(str(row.PHY_ADDR1)) && !isCondominiumUnit(row));
    return whole.length === 1 && exact.length === 0
      ? { status: 'chosen', attributes: whole[0] }
      : { status: 'declined', reason: 'mismatch' };
  }

  if (agreeing.length > 1 || isCondominiumUnit(agreeing[0])) {
    return { status: 'declined', reason: 'which-unit' };
  }

  return { status: 'chosen', attributes: agreeing[0] };
}

/**
 * The figures for a property somebody has just picked, from the statewide roll.
 *
 * The parcel is found by where it stands and then checked — see chooseParcel —
 * before a figure is allowed through.
 */
export async function resolveParcelValue(
  lookup: ValueLookup,
  address: string,
  countyName: string,
  parcelId: string | null = null,
  signal?: AbortSignal,
): Promise<ParcelValueResult> {
  // The statewide geocoder answers with an address as well as a point, and the
  // address it answers with is the one to check the parcel against: it is what
  // the geocoder believes it found, rather than what the reader half-typed.
  const geocoded =
    lookup.kind === 'esri' ? await geocodeSuggestion(lookup.magicKey, lookup.text, signal) : null;

  // An interpolated match is a guess at where along a block a number falls. The
  // Census geocoder makes the same guess for free, and it is wrong often enough
  // that no figure is better than the one it would produce.
  if (lookup.kind === 'esri' && !geocoded) return { status: 'unavailable' };
  if (geocoded && !geocoded.rooftop) return { status: 'declined', reason: 'mismatch' };

  const point =
    lookup.kind === 'point'
      ? { lat: lookup.lat, lon: lookup.lon }
      : geocoded
        ? { lat: geocoded.lat, lon: geocoded.lon }
        : lookup.kind === 'jacksonville'
          ? await jacksonvillePoint(lookup.magicKey, signal)
          : null;

  // A point Esri produced is Esri's, and is not kept even as a cache key.
  const rows = await parcelsAtPoint(point, { cacheable: lookup.kind !== 'esri', signal });
  if (rows === UNAVAILABLE) return { status: 'unavailable' };

  const choice = chooseParcel(rows, {
    address,
    parcelId,
    geocodedAddress: geocoded?.address ?? null,
  });
  if (choice.status === 'declined') return choice;

  const attributes = choice.attributes;
  const rollAddress = str(attributes.PHY_ADDR1);
  const assessed = num(attributes.AV_SD);
  const just = num(attributes.JV);
  if (!assessed && !just) return { status: 'declined', reason: 'mismatch' };

  // Which county published this figure is the roll's own answer — CO_NO on the
  // row — rather than the caller's, because a statewide geocoder's suggestion
  // arrives without a county and learns one here.
  const county =
    countyByCode(attributes.CO_NO) ??
    countyByName(countyName) ??
    countyByName(geocoded?.countyName);

  return {
    status: 'found',
    value: {
      // The address the figure is filed under, which on a corner lot is not
      // always the one that was typed.
      address: formatAddressForDisplay(rollAddress ?? address),
      countySlug: county?.slug ?? null,
      countyName: county?.name ?? null,
      parcelId: str(attributes.PARCEL_ID),
      assessedValue: assessed,
      justValue: just,
      rollYear: num(attributes.ASMNT_YR),
      homestead: readHomestead(attributes.JV_HMSTD),
      lastSale: recordedSale(attributes.SALE_PRC1, num(attributes.SALE_YR1)),
      sourceName: `${county?.name ?? countyName} roll as published by the Florida Department of Revenue`,
      sourceUrl: STATEWIDE_SOURCE_URL,
    },
  };
}

/** What a suggestion carries so its figures can be fetched when it is picked. */
function lookupFor(row: RollRow, centroid?: { x?: number; y?: number }): ValueLookup | null {
  if (row.assessedValue || row.justValue) return null;
  if (typeof centroid?.x !== 'number' || typeof centroid?.y !== 'number') return null;
  return isInFlorida(centroid.x, centroid.y)
    ? { kind: 'point', lat: centroid.y, lon: centroid.x }
    : null;
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
 * is the honest position outside the rolls above.
 */
async function queryCensus(typed: string, search: SearchContext): Promise<PropertySuggestion[]> {
  const url = `${CENSUS_GEOCODER}?${new URLSearchParams({
    // The geocoder matches a street range rather than a place name, so an
    // address with no state on it would be matched against the whole country.
    address: /\bfl\b|florida/i.test(typed) ? typed : `${typed}, FL`,
    benchmark: 'Public_AR_Current',
    vintage: 'Current_Current',
    layers: 'Counties',
    format: 'json',
  })}`;

  const payload = (await getJson(url, search)) as
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
      homestead: null,
      lastSale: null,
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

/**
 * The statewide half of the dropdown, where a key is configured.
 *
 * Every county is covered, including the forty-five with nothing of their own
 * to search, and a suggestion carries no county until it is picked: Esri's
 * suggestions are text and a handle, and the county comes back with the
 * geocode. The page leaves the county selector saying "another Florida county"
 * for that moment and corrects it when the figure lands.
 */
async function queryGeocoder(typed: string, signal?: AbortSignal): Promise<PropertySuggestion[]> {
  const suggestions = await suggestAddresses(typed, signal);

  return suggestions.flatMap((suggestion) => {
    // "1832 Manatee Ave E, Bradenton, FL, 34208, USA"
    const [street, city, , zip] = suggestion.text.split(',').map((part) => part.trim());
    if (!street || !parseTypedAddress(street).number) return [];

    return [
      {
        id: `esri:${suggestion.magicKey}`,
        address: formatAddressForDisplay(street),
        city: city ? formatPlaceForDisplay(city) : null,
        zip: zip && /^\d{5}$/.test(zip) ? zip : null,
        // Unknown until the geocode, which happens when somebody picks it.
        countySlug: '',
        countyName: '',
        parcelId: null,
        assessedValue: null,
        justValue: null,
        rollYear: null,
        useDescription: null,
        homestead: null,
        lastSale: null,
        sourceName: 'Esri World Geocoding Service',
        sourceUrl: STATEWIDE_SOURCE_URL,
        valueLookup: { kind: 'esri', magicKey: suggestion.magicKey, text: suggestion.text },
      },
    ];
  });
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
  search: SearchContext,
): Promise<PropertySuggestion[]>[] {
  const work: Promise<PropertySuggestion[]>[] = [];

  const roll = rollFor(countySlug);
  if (roll) work.push(queryRoll(roll, parsed, typedStreet, search));

  // The two counties that publish where their addresses are but not what they
  // are worth; the figure follows when a property is picked.
  if (countySlug === 'orange-county') work.push(queryOrangeAddressPoints(parsed, typedStreet, search));
  if (countySlug === 'duval-county') work.push(queryJacksonvilleGeocoder(typed, search));

  return work;
}

const hasFigure = (suggestion: PropertySuggestion) =>
  Boolean(suggestion.assessedValue || suggestion.justValue || suggestion.valueLookup);

/** Two facts that agree, or one of them unknown. */
const sameOrUnknown = (a: string | null, b: string | null) =>
  !a || !b || a.toUpperCase() === b.toUpperCase();

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
 *
 * `signal` is the whole search's deadline. It reaches every request below, so
 * when it fires they all stop, and whatever had arrived by then is the answer.
 */
export async function searchProperties(query: string, signal?: AbortSignal): Promise<PropertySearch> {
  const typed = query.trim();
  if (typed.length < MIN_QUERY_LENGTH) return { suggestions: [], status: 'ok' };

  // Asking fifteen Florida services about an Atlanta address finds the same
  // street name in Tampa, which is worse than finding nothing.
  if (namesAnotherState(typed)) return { suggestions: [], status: 'outside-florida' };

  const parsed = parseTypedAddress(typed);
  if (!parsed.number) return { suggestions: [], status: 'ok' };

  const search: SearchContext = { signal, failures: 0 };

  // Rows are ranked against the street line alone. The city is a separate
  // signal below, and leaving it in the comparison punished the sources that
  // answer with the street and nothing else: "1409 NE 27 Dr, Wilton Manors"
  // matched against "1409 NE 27 DR" would score two thirds rather than one.
  const typedStreet = typed.split(',')[0]?.trim() || typed;

  // A place name in the address is a county without asking anybody, so the
  // county it names joins the first wave.
  const guessed = matchCounty(typed)?.countySlug;
  const asked = new Set(guessed ? [...ALWAYS_ASKED, guessed] : ALWAYS_ASKED);

  const censusWork = queryCensus(typed, search);
  const geocoderWork = queryGeocoder(typed, signal);
  const firstWave = await Promise.all(
    [...asked].flatMap((countySlug) => sourcesFor(countySlug, parsed, typedStreet, typed, search)),
  );

  const census = await censusWork;
  const secondWave = signal?.aborted
    ? []
    : await Promise.all(
        [...new Set(census.map((suggestion) => suggestion.countySlug))]
          .filter((countySlug) => !asked.has(countySlug))
          .flatMap((countySlug) => {
            asked.add(countySlug);
            return sourcesFor(countySlug, parsed, typedStreet, typed, search);
          }),
      );

  /** A suggestion at the number typed that shares enough of the street to offer. */
  const offerable = (suggestion: PropertySuggestion) =>
    parseTypedAddress(suggestion.address).number === parsed.number &&
    scoreAddressMatch(typedStreet, suggestion.address) >= MIN_MATCH_SCORE;

  // Last resort, and only for an address that looks finished: the geocoder
  // cannot place a house in a subdivision built since its last street file, so
  // an address the first two waves both missed gets put to every county that
  // keeps a roll. It is the one case worth the requests, because the reader has
  // typed the whole thing and been given nothing — and "nothing" is judged on
  // the rows that would be offered, not on the rows that came back, or a
  // neighbour at the same number on another street would stand in for a hit.
  const found = [...firstWave, ...secondWave].flat().filter(offerable);
  const lastWave =
    found.length === 0 && !signal?.aborted && !geocoderConfigured() && looksComplete(typed)
      ? await Promise.all(
          COUNTY_ROLLS.filter((roll) => !asked.has(roll.countySlug)).map((roll) =>
            queryRoll(roll, parsed, typedStreet, search),
          ),
        )
      : [];

  // The geocoders' rows go last, so that where a county and a geocoder describe
  // the same house it is the county's row that survives the deduplication
  // below — and the statewide geocoder, which can produce a figure anywhere,
  // goes ahead of the Census one, which cannot produce one at all.
  const results = [...firstWave, ...secondWave, ...lastWave, await geocoderWork, census];

  const merged: { key: string; suggestion: PropertySuggestion }[] = [];

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
    // The county and the city count as the same wherever one side does not
    // know it. The statewide geocoder names no county until a suggestion is
    // picked, and Jacksonville's locator answers "1200 RIVERSIDE AVE, 32204"
    // with no city in it; either would otherwise list a house a second time.
    // Where both sides know, they have to agree, because one county really can
    // hold the same street address twice — 3301 N University Dr is a real
    // address in both Davie and Sunrise.
    const key = addressKey(suggestion.address);
    const duplicate = merged.find(
      (shown) =>
        shown.key === key &&
        sameOrUnknown(shown.suggestion.countySlug, suggestion.countySlug) &&
        sameOrUnknown(shown.suggestion.city, suggestion.city),
    )?.suggestion;

    if (duplicate) {
      // Two sources describing one house between them: the statewide geocoder
      // knows the address and not the county, the Census geocoder knows the
      // county and cannot price it. The row that is kept takes what the
      // discarded one knew.
      duplicate.city ??= suggestion.city;
      duplicate.zip ??= suggestion.zip;
      if (!duplicate.countySlug && suggestion.countySlug) {
        duplicate.countySlug = suggestion.countySlug;
        duplicate.countyName = suggestion.countyName;
      }
      continue;
    }

    merged.push({ key, suggestion });
  }

  const ranked = merged
    .map(({ suggestion }) => ({
      suggestion,
      match: scoreAddressMatch(typedStreet, suggestion.address),
      score:
        scoreAddressMatch(typedStreet, suggestion.address) +
        // A suggestion that brings a figure, or can fetch one, is worth more
        // than a better-spelled one that cannot. Typing "400 S Orange Ave"
        // without a city otherwise fills the whole list with exact geocoder
        // matches in five counties and buries the Orlando parcel that would
        // have answered the question.
        (hasFigure(suggestion) ? 0.12 : 0) +
        // And one whose city is the city they typed is the one they meant.
        (parsed.locality && suggestion.city
          ? suggestion.city.toUpperCase().includes(parsed.locality.toUpperCase())
            ? 0.1
            : 0
          : 0) +
        // As is one in the ZIP they typed, which is the more exact of the two.
        (parsed.zip && suggestion.zip === parsed.zip ? 0.1 : 0),
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

    const figure = hasFigure(suggestion);

    if (figure && priced >= MAX_PRICED_SUGGESTIONS) continue;
    if (!figure && unpriced >= MAX_UNPRICED_SUGGESTIONS) continue;

    if (figure) priced += 1;
    else unpriced += 1;
    chosen.push(suggestion);
  }

  // An empty list is only "nothing there" if everybody asked answered. A
  // county that timed out may well have had the house.
  return {
    suggestions: chosen,
    status: chosen.length === 0 && search.failures > 0 ? 'unavailable' : 'ok',
  };
}
