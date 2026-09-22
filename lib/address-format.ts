// Reading a half-typed street address, and writing one back out.
//
// Everything here is string work with no network in it, which is the point:
// the county roll services in lib/property-lookup.ts each want the address in
// their own shape, and the awkward parts — a house number that has to match
// exactly, an ordinal that one county writes "48TH" and the next writes "48",
// a SQL LIKE clause built from something a stranger typed — are easier to be
// sure of when they are pure functions with tests against them.
//
// None of this is a geocoder. It does not know whether an address exists; it
// knows how to ask a property appraiser's roll about one and how to rank what
// comes back.

/** A directional as the rolls store it, so "NW" is read as one rather than as a street. */
const DIRECTIONALS = new Set(['N', 'S', 'E', 'W', 'NE', 'NW', 'SE', 'SW']);

/**
 * The same directionals written out. A reader types "North Federal Hwy" and
 * every roll files it as "N FEDERAL HWY", so the long form is read as the short
 * one wherever it stands where a directional stands.
 */
const SPELLED_DIRECTIONALS: Record<string, string> = {
  NORTH: 'N', SOUTH: 'S', EAST: 'E', WEST: 'W',
  NORTHEAST: 'NE', NORTHWEST: 'NW', SOUTHEAST: 'SE', SOUTHWEST: 'SW',
};

/**
 * Words one office abbreviates and another spells out inside a street's name,
 * as opposed to its type: St Andrews Blvd is Saint Andrews Blvd. Kept apart
 * from the street types because "ST" at the front of a name is Saint and at
 * the end of one is Street.
 */
const NAME_ABBREVIATIONS: Record<string, string> = {
  SAINT: 'ST',
  MOUNT: 'MT',
};

/**
 * Street types, in both the forms an office writes them.
 *
 * Most abbreviations are a prefix of the word they stand for — St/Street,
 * Ave/Avenue, Ct/Court — so a LIKE that ends before the type matches either
 * spelling. Trl/Trail, Pkwy/Parkway and Hwy/Highway are the ones that are not,
 * which is the reason a source that spells the type out is asked for a prefix
 * with the type left off entirely.
 */
const STREET_TYPE_CANON: Record<string, string> = {
  ST: 'ST', STREET: 'ST',
  AVE: 'AVE', AV: 'AVE', AVENUE: 'AVE',
  BLVD: 'BLVD', BOULEVARD: 'BLVD',
  DR: 'DR', DRIVE: 'DR',
  RD: 'RD', ROAD: 'RD',
  LN: 'LN', LANE: 'LN',
  CT: 'CT', COURT: 'CT',
  CIR: 'CIR', CIRCLE: 'CIR',
  PL: 'PL', PLACE: 'PL',
  TER: 'TER', TERR: 'TER', TERRACE: 'TER',
  TRL: 'TRL', TRAIL: 'TRL',
  PKWY: 'PKWY', PARKWAY: 'PKWY',
  HWY: 'HWY', HIGHWAY: 'HWY',
  WAY: 'WAY',
  LOOP: 'LOOP',
  RUN: 'RUN',
  PT: 'PT', POINT: 'PT',
  CV: 'CV', COVE: 'CV',
  XING: 'XING', CROSSING: 'XING',
  SQ: 'SQ', SQUARE: 'SQ',
  PATH: 'PATH',
  PASS: 'PASS',
  BND: 'BND', BEND: 'BND',
  PLZ: 'PLZ', PLAZA: 'PLZ',
  ROW: 'ROW',
  WALK: 'WALK',
  CRES: 'CRES', CRESCENT: 'CRES',
  ALY: 'ALY', ALLEY: 'ALY',
  GLN: 'GLN', GLEN: 'GLN',
  GRN: 'GRN', GREEN: 'GRN',
  KNL: 'KNL', KNOLL: 'KNL',
  RDG: 'RDG', RIDGE: 'RDG',
  TRCE: 'TRCE', TRACE: 'TRCE',
  VW: 'VW', VIEW: 'VW',
  VIS: 'VIS', VISTA: 'VIS',
  MNR: 'MNR', MANOR: 'MNR',
  ISLE: 'ISLE',
  KEY: 'KEY',
  CAY: 'CAY',
  CMN: 'CMN', COMMON: 'CMN',
  EXT: 'EXT', EXTENSION: 'EXT',
};

const STREET_TYPES = new Set(Object.keys(STREET_TYPE_CANON));


/**
 * Words that introduce a unit, and everything after one is the unit.
 *
 * A county's address point stands on a building; the Department of Revenue's
 * row for the parcel under it is often filed with a unit on the end — "427 W
 * 10th Ave" against "427 W 10TH AVE APT A". That is the same front door. Two
 * different units are not: 2484 San Tecla St Unit 105 and Unit 109 are two
 * condominiums with two values, stacked on the same spot of the map.
 */
const UNIT_MARKERS = new Set([
  'APT', 'UNIT', 'STE', 'SUITE', 'LOT', 'BLDG', 'BLD', 'RM', 'ROOM', 'TRLR', 'SPC', 'SPACE',
  'FLOOR', 'PH', '#',
]);

/** "12 Main St, Apt 5, Miami": a unit after a comma belongs to the street line, not the city. */
const UNIT_AFTER_COMMA = /^\s*(#|(APT|UNIT|STE|SUITE|LOT|BLDG|BLD|RM|ROOM|TRLR|SPC|SPACE|FLOOR|PH)\b)/i;

/**
 * What stands in front of a road that is named by a number: US Highway 1,
 * State Road 7, SR A1A. After one of these the number is the road, not a unit.
 */
const ROUTE_PREFIXES = new Set(['US', 'SR', 'CR', 'STATE', 'COUNTY']);
const ROUTE_WORDS = new Set(['HWY', 'HIGHWAY', 'RD', 'ROAD', 'ROUTE']);

/** Dropped from the tail of a typed address: they narrow nothing on a Florida roll. */
const TRAILING_NOISE = new Set(['FL', 'FLA', 'FLORIDA', 'USA', 'US']);

/** Postal codes for everywhere that is not Florida, for telling a reader we cannot help there. */
const OTHER_STATES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS',
  'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY',
  'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV',
  'WI', 'WY', 'PR', 'VI', 'GU',
]);

export interface TypedAddress {
  /** The house number, which every roll query below matches exactly. */
  number: string | null;
  /** "NW" in "1409 NW 48th St", where one was typed. */
  directional: string | null;
  /** The street, normalised: ordinals reduced to digits, punctuation gone, no unit. */
  street: string[];
  /** "105" in "2484 San Tecla St Unit 105". Compared exactly, never as a prefix. */
  unit: string | null;
  /** Whatever followed a comma — a city, usually. Never used to query, only to rank. */
  locality: string | null;
  zip: string | null;
}

/**
 * Upper case, no punctuation, single spaces. `#` and `-` survive because unit
 * numbers are written with them; everything else that is not a letter, a digit
 * or a space is dropped rather than escaped, which is also what keeps a typed
 * quote or percent sign out of the LIKE clauses built further down.
 *
 * An apostrophe becomes a space like everything else, so O'Brien reads as
 * "O BRIEN". The functions below know that a lone O in front of a name is what
 * is left of one.
 */
export function normalizeAddressText(raw: string): string {
  return raw
    .toUpperCase()
    // A full stop directly after a single letter is an abbreviation's, so it is
    // removed rather than turned into a space: "N.W." is a directional, and
    // "N W" is two street names that match nothing.
    .replace(/\b([A-Z])\./g, '$1')
    .replace(/[^A-Z0-9#/\- ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** "48TH" -> "48", "2ND" -> "2". Broward writes the digits alone; Palm Beach does not. */
export function stripOrdinal(token: string): string {
  const match = /^(\d+)(ST|ND|RD|TH)$/.exec(token);
  return match ? match[1] : token;
}

/** The form both sides of a comparison are put in before they are compared. */
export function normalizeForMatch(raw: string): string {
  return normalizeAddressText(raw).split(' ').map(stripOrdinal).filter(Boolean).join(' ');
}

/** Whether `next`, after a lone O, is the rest of an O'Brien rather than a street called O. */
const isElidedName = (next: string | undefined): next is string =>
  next !== undefined && /^[A-Z]{2,}$/.test(next) && !STREET_TYPES.has(next);

/** A road named by what follows it — the HIGHWAY in "US HIGHWAY 1". */
const isRouteWord = (tokens: string[], index: number) =>
  ROUTE_WORDS.has(tokens[index]) && (index === 0 || ROUTE_PREFIXES.has(tokens[index - 1]));

/**
 * Whether the street's name could end at `index`, so that anything after it
 * is a unit: a street type, a directional after one, or a route's number.
 */
function endsStreet(tokens: string[], index: number): boolean {
  const token = tokens[index];
  if (index > 0 && STREET_TYPES.has(token) && !isRouteWord(tokens, index)) return true;
  if (index > 0 && DIRECTIONALS.has(token) && STREET_TYPES.has(tokens[index - 1])) return true;
  return index > 0 && isRouteWord(tokens, index - 1);
}

/** "#100-A", "UNIT 100A" and "0105" are written for 100A and 105. */
function unitKey(tokens: string[]): string | null {
  const joined = tokens.join('').replace(/[#\-/]/g, '').replace(/^0+(?=[0-9A-Z])/, '');
  return joined === '' ? null : joined;
}

/** The street and the unit, which some offices write with a marker and some without. */
function splitUnit(tokens: string[]): { street: string[]; unit: string | null } {
  const at = tokens.findIndex(
    (token, index) => index > 0 && (UNIT_MARKERS.has(token) || token.startsWith('#')),
  );
  if (at > 0) {
    const marker = tokens[at];
    const rest = marker.startsWith('#') ? [marker, ...tokens.slice(at + 1)] : tokens.slice(at + 1);
    // A penthouse is numbered on its own: PH 14 is not unit 14.
    return { street: tokens.slice(0, at), unit: unitKey(marker === 'PH' ? ['PH', ...rest] : rest) };
  }

  // No marker, which is how Miami-Dade and the Department of Revenue write a
  // unit: "1850 S BAYSHORE DR 1", "121 NE 5 ST 1200". Only after something
  // that ends a street, so that 48 in "NW 48 ST" and 1 in "US HIGHWAY 1" stay
  // the street's.
  const last = tokens.length - 1;
  const tail = tokens[last];
  if (
    last >= 2 &&
    tail.length <= 6 &&
    (/\d/.test(tail) || (/^[A-Z]$/.test(tail) && !DIRECTIONALS.has(tail))) &&
    endsStreet(tokens, last - 1)
  ) {
    return { street: tokens.slice(0, last), unit: unitKey([tail]) };
  }

  return { street: tokens, unit: null };
}

export function parseTypedAddress(raw: string): TypedAddress {
  // The part after the first comma is the city, near enough. Keeping it out of
  // the street tokens matters: "1409 NW 48th St, Boca Raton" must not look for
  // a street called "BOCA".
  const [head, ...tail] = raw.split(',');
  let line = head;
  while (tail.length > 0 && UNIT_AFTER_COMMA.test(tail[0])) line += ` ${tail.shift()}`;
  const locality = tail.join(' ').replace(/\b(FL|FLA|FLORIDA|USA|US)\b/gi, '').trim();

  const tokens = normalizeAddressText(line).split(' ').filter(Boolean);

  let zip: string | null = null;
  while (tokens.length > 0) {
    const last = tokens[tokens.length - 1];
    if (/^\d{5}(-\d{4})?$/.test(last) && tokens.length > 1) {
      zip = last.slice(0, 5);
      tokens.pop();
      continue;
    }
    if (TRAILING_NOISE.has(last)) {
      tokens.pop();
      continue;
    }
    break;
  }

  const zipInLocality = /\b(\d{5})(-\d{4})?\b/.exec(locality);
  if (!zip && zipInLocality) zip = zipInLocality[1];

  // "12-34" is one house number, as some older plats number a split lot.
  let number: string | null = null;
  if (tokens.length > 0 && /^\d+(-\d+)?[A-Z]?$/.test(tokens[0])) number = tokens.shift() ?? null;

  let directional: string | null = null;
  if (tokens.length > 1 && DIRECTIONALS.has(tokens[0])) {
    directional = tokens.shift() ?? null;
  } else if (
    tokens.length > 1 &&
    SPELLED_DIRECTIONALS[tokens[0]] &&
    // "100 West St" is a street called West.
    tokens.slice(1).some((token) => !STREET_TYPES.has(token))
  ) {
    directional = SPELLED_DIRECTIONALS[tokens.shift() as string];
  }

  const { street, unit } = splitUnit(tokens);

  return {
    number,
    directional,
    street: street.map(stripOrdinal),
    unit,
    locality: locality.replace(/\b\d{5}(-\d{4})?\b/, '').replace(/\s+/g, ' ').trim() || null,
    zip,
  };
}

/**
 * Whether what was typed says, in so many words, that the property is not in
 * Florida: another state's code after the city, or a ZIP outside the 32–34
 * range Florida's are in. Anything less explicit than that is searched.
 */
export function namesAnotherState(raw: string): boolean {
  const { zip } = parseTypedAddress(raw);
  if (zip && !/^3[234]/.test(zip)) return true;

  const [, ...tail] = raw.split(',');
  const words = normalizeAddressText(tail.join(' '))
    .split(' ')
    .filter((word) => word !== '' && !/^\d/.test(word) && !TRAILING_NOISE.has(word));
  const last = words[words.length - 1];
  return last !== undefined && OTHER_STATES.has(last);
}

/**
 * The prefix a roll that keeps the whole address in one column is asked for.
 *
 * It stops at the first all-digit street token — "1409 NW 48TH ST" becomes
 * "1409 NW 48" — because that is the one place the counties disagree with each
 * other: Broward stores "48", Palm Beach stores "48TH", and a prefix that
 * commits to either is wrong in one of them. Stopping short matches both, at
 * the cost of also matching 480TH Street, which the reader can see and ignore.
 *
 * A unit is never part of it. Miami-Dade files a condominium as "… DR 1401"
 * and the next county as "… DR UNIT 1401", so the unit is asked for on its
 * own; see unitPatterns.
 */
export function rollAddressPrefix(
  parsed: TypedAddress,
  options: { dropStreetType?: boolean } = {},
): string | null {
  if (!parsed.number) return null;

  // Stopping before the type, rather than dropping it: a street type can sit
  // in the middle of an address — "1215 CHERRY ST N" — and removing it leaves
  // "1215 CHERRY N", which is a prefix of nothing at all.
  const typeAt = parsed.street.findIndex((token, index) => index > 0 && STREET_TYPES.has(token));
  const street =
    options.dropStreetType && typeAt > 0 ? parsed.street.slice(0, typeAt) : parsed.street;

  const parts = [parsed.number];
  if (parsed.directional) parts.push(parsed.directional);

  for (const token of street) {
    parts.push(token);
    if (/^\d+$/.test(token)) break;
  }

  return parts.join(' ');
}

/**
 * The spellings a roll might file one prefix under, as LIKE patterns.
 *
 * O'Brien is the case this is for: one office writes O'BRIEN, another O BRIEN
 * and a third OBRIEN. The apostrophe never reaches a query — see
 * normalizeAddressText — so the name is asked for as O_BRIEN, where `_` is
 * LIKE's wildcard for one character and matches the space and the apostrophe
 * both, and again as OBRIEN. Saint and Mount go both ways for the same reason.
 *
 * The prefix handed in must already be safe to quote; the underscores added
 * here are the only wildcards in what comes back.
 */
export function prefixVariants(prefix: string): string[] {
  const tokens = prefix.split(' ').filter(Boolean);
  let variants: string[][] = [[]];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const next = tokens[index + 1];
    let options = [token];

    if (token === 'O' && isElidedName(next)) {
      options = [`O_${next}`, `O${next}`];
      index += 1;
    } else if (next !== undefined && (token === 'ST' || token === 'SAINT')) {
      options = ['ST', 'SAINT'];
    } else if (next !== undefined && (token === 'MT' || token === 'MOUNT')) {
      options = ['MT', 'MOUNT'];
    }

    variants = variants.flatMap((variant) => options.map((option) => [...variant, option]));
  }

  // Two names like that in one prefix is already four queries' worth.
  return variants.slice(0, 4).map((variant) => variant.join(' '));
}

/**
 * LIKE patterns for a unit written into an address column, however the office
 * writes it: "… DR 1401", "… DR UNIT 1401", "… DR #1401".
 */
export function unitPatterns(unit: string): string[] {
  return [`% ${unit}`, `%#${unit}`];
}

/**
 * One address in the form two offices' spellings of it agree on: ordinals as
 * digits, street types and directionals abbreviated, Saint as ST, O'Brien as
 * OBRIEN.
 */
function canonicalTokens(raw: string): string[] {
  const tokens = normalizeForMatch(raw).split(' ').filter(Boolean);
  const canonical: string[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const next = tokens[index + 1];
    if (token === 'O' && isElidedName(next)) {
      canonical.push(`O${next}`);
      index += 1;
      continue;
    }
    canonical.push(
      SPELLED_DIRECTIONALS[token] ?? NAME_ABBREVIATIONS[token] ?? STREET_TYPE_CANON[token] ?? token,
    );
  }

  return canonical;
}

/** A street's name, its type and a directional after it, taken apart for comparing. */
function streetParts(street: string[]): {
  name: string[];
  type: string | null;
  postDirectional: string | null;
} {
  const tokens = [...street];

  let postDirectional: string | null = null;
  const trailing = tokens[tokens.length - 1];
  // Three tokens at least: "AVENUE E" is a street called Avenue E.
  if (
    tokens.length >= 3 &&
    (DIRECTIONALS.has(trailing) || SPELLED_DIRECTIONALS[trailing]) &&
    STREET_TYPES.has(tokens[tokens.length - 2])
  ) {
    postDirectional = SPELLED_DIRECTIONALS[trailing] ?? trailing;
    tokens.pop();
  }

  let type: string | null = null;
  if (tokens.length >= 2 && STREET_TYPES.has(tokens[tokens.length - 1])) {
    type = STREET_TYPE_CANON[tokens.pop() as string];
  }

  return { name: canonicalTokens(tokens.join(' ')), type, postDirectional };
}

/**
 * Whether two addresses are the same address, allowing for the fact that one of
 * them came off a different office's keyboard.
 *
 * This guards the statewide value lookup, which finds a parcel by where it is
 * rather than by what it is called: the Department of Revenue's row has to
 * agree with the address the reader picked, or the figure belongs to the house
 * next door and nothing on the screen would say so.
 *
 * So the whole name of the street has to agree, word for word, and not merely
 * its first word — 400 S Orange Ave and 400 S Orange Blossom Trl are both real
 * Orlando addresses at the same number. A word may be written two ways only
 * where the two ways are known to be one word: a street type and its
 * abbreviation, a directional spelled out, Saint and St. Oak is not short for
 * Oakland, and Sea is not short for Seabreeze.
 *
 * Where both sides carry a unit it has to be the same unit. Where one side has
 * none, that is missing information rather than a contradiction, and the
 * caller decides whether a building of many units is enough of an answer.
 */
export function addressesAgree(a: string, b: string): boolean {
  const left = parseTypedAddress(a);
  const right = parseTypedAddress(b);

  if (!left.number || !right.number || left.number !== right.number) return false;

  // A directional, a type or a unit on both sides has to agree; on one side
  // only it is missing information rather than a contradiction.
  const clash = (x: string | null, y: string | null) => x !== null && y !== null && x !== y;

  if (clash(left.directional, right.directional)) return false;
  if (clash(left.unit, right.unit)) return false;

  const leftStreet = streetParts(left.street);
  const rightStreet = streetParts(right.street);

  if (leftStreet.name.length === 0 || rightStreet.name.length === 0) return false;

  // 100 Park Ave and 100 Park Way are different addresses.
  if (clash(leftStreet.type, rightStreet.type)) return false;
  if (clash(leftStreet.postDirectional, rightStreet.postDirectional)) return false;

  return (
    leftStreet.name.length === rightStreet.name.length &&
    leftStreet.name.every((token, index) => token === rightStreet.name[index])
  );
}

/**
 * One address written one way, so two offices' spellings of the same house
 * collapse into a single suggestion.
 *
 * "1409 E Esther St" off a geocoder and "1409 E Esther Street" off the county's
 * address points are the same front door, and a dropdown that offers both —
 * one of them with a figure attached and one without — makes the reader choose
 * between two identical-looking lines. Street types are canonicalised rather
 * than dropped, because 100 Park Ave and 100 Park Way are two addresses.
 */
export function addressKey(raw: string): string {
  return canonicalTokens(raw).join(' ');
}

/** How closely `got` continues `wanted`, both already in one form. */
function prefixScore(wanted: string, got: string): number {
  if (!wanted || !got) return 0;
  if (got === wanted) return 1;
  if (got.startsWith(wanted)) return 0.9 - Math.min(got.length - wanted.length, 40) / 400;

  const wantedTokens = wanted.split(' ');
  const gotTokens = new Set(got.split(' '));
  const hits = wantedTokens.filter((token) => gotTokens.has(token)).length;

  return (hits / wantedTokens.length) * 0.5;
}

/**
 * How well a row off a roll answers what was typed. 1 is "this is what they
 * were typing", 0 is "show something else".
 *
 * A prefix match wins and the shortest prefix match wins hardest, so typing
 * "100 Worth Ave" puts "100 WORTH AVE" above "100 WORTH AVE PH 14" rather than
 * burying it under thirty condominium units.
 *
 * It is scored twice, as typed and in canonical form, and the better of the
 * two stands: the canonical form is what lets "North Federal" find "N
 * FEDERAL", and the typed form is what keeps a half-typed "Aven" the start of
 * a roll's "AVENUE".
 */
export function scoreAddressMatch(typed: string, candidate: string): number {
  return Math.max(
    prefixScore(normalizeForMatch(typed), normalizeForMatch(candidate)),
    prefixScore(addressKey(typed), addressKey(candidate)),
  );
}

/**
 * The few Mac names common enough on a street sign to be worth spelling
 * right. Mac is also the start of Mack, Macon and Machado, so unlike Mc it
 * cannot be read off the letters.
 */
const MAC_NAMES = new Set(['MACARTHUR', 'MACDONALD', 'MACGREGOR', 'MACINTOSH', 'MACKENZIE', 'MACLEOD']);

function titleWord(token: string): string {
  if (/^MC[A-Z]{2,}$/.test(token)) return `Mc${token.charAt(2)}${token.slice(3).toLowerCase()}`;
  if (MAC_NAMES.has(token)) return `Mac${token.charAt(3)}${token.slice(4).toLowerCase()}`;
  return token.charAt(0) + token.slice(1).toLowerCase();
}

/**
 * Title case for a roll's shouting: "1409 NW 48TH ST" -> "1409 NW 48th St",
 * "MCDONALD" -> "McDonald", "O BRIEN" -> "O’Brien", and the parts that are
 * codes — A1A, US Highway 1, SR 7, PH 14 — left as codes.
 */
export function formatAddressForDisplay(raw: string): string {
  const tokens = normalizeAddressText(raw).split(' ').filter(Boolean);
  const words: string[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const next = tokens[index + 1];
    const beforeNumber = next !== undefined && /^\d/.test(next);

    if (DIRECTIONALS.has(token)) words.push(token);
    else if (/^\d+(ST|ND|RD|TH)$/.test(token)) words.push(token.toLowerCase());
    else if (/\d/.test(token)) words.push(token);
    else if (
      (token.length === 2 && ROUTE_PREFIXES.has(token) && (beforeNumber || ROUTE_WORDS.has(next ?? ''))) ||
      (token === 'PH' && beforeNumber)
    ) {
      words.push(token);
    } else if (token === 'O' && isElidedName(next)) {
      words.push(`O’${titleWord(next)}`);
      index += 1;
    } else {
      words.push(titleWord(token));
    }
  }

  return words.join(' ');
}

/** Title case for a city or county name off a roll, where every word is a word. */
export function formatPlaceForDisplay(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/(^|[\s\-/])([a-z])/g, (_, lead: string, letter: string) => lead + letter.toUpperCase());
}
