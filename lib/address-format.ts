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
 * 10th Ave" against "427 W 10TH AVE APT A". That is the same front door.
 */
const UNIT_MARKERS = new Set([
  'APT', 'UNIT', 'STE', 'SUITE', 'LOT', 'BLDG', 'BLD', 'RM', 'ROOM', 'TRLR', 'SPC', 'SPACE',
  'FLOOR', 'PH', '#',
]);

/** Dropped from the tail of a typed address: they narrow nothing on a Florida roll. */
const TRAILING_NOISE = new Set(['FL', 'FLA', 'FLORIDA', 'USA', 'US']);

export interface TypedAddress {
  /** The house number, which every roll query below matches exactly. */
  number: string | null;
  /** "NW" in "1409 NW 48th St", where one was typed. */
  directional: string | null;
  /** The street, normalised: ordinals reduced to digits, punctuation gone. */
  street: string[];
  /** Whatever followed a comma — a city, usually. Never used to query, only to rank. */
  locality: string | null;
  zip: string | null;
}

/**
 * Upper case, no punctuation, single spaces. `#` and `-` survive because unit
 * numbers are written with them; everything else that is not a letter, a digit
 * or a space is dropped rather than escaped, which is also what keeps a typed
 * quote or percent sign out of the LIKE clauses built further down.
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

export function parseTypedAddress(raw: string): TypedAddress {
  // The part after the first comma is the city, near enough. Keeping it out of
  // the street tokens matters: "1409 NW 48th St, Boca Raton" must not look for
  // a street called "BOCA".
  const [head, ...tail] = raw.split(',');
  const locality = tail.join(' ').replace(/\b(FL|FLA|FLORIDA|USA|US)\b/gi, '').trim();

  const tokens = normalizeAddressText(head).split(' ').filter(Boolean);

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

  let number: string | null = null;
  if (tokens.length > 0 && /^\d+[A-Z]?$/.test(tokens[0])) number = tokens.shift() ?? null;

  let directional: string | null = null;
  if (tokens.length > 1 && DIRECTIONALS.has(tokens[0])) directional = tokens.shift() ?? null;

  return {
    number,
    directional,
    street: tokens.map(stripOrdinal),
    locality: locality.replace(/\b\d{5}(-\d{4})?\b/, '').replace(/\s+/g, ' ').trim() || null,
    zip,
  };
}

/**
 * The prefix a roll that keeps the whole address in one column is asked for.
 *
 * It stops at the first all-digit street token — "1409 NW 48TH ST" becomes
 * "1409 NW 48" — because that is the one place the counties disagree with each
 * other: Broward stores "48", Palm Beach stores "48TH", and a prefix that
 * commits to either is wrong in one of them. Stopping short matches both, at
 * the cost of also matching 480TH Street, which the reader can see and ignore.
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
 * Whether two addresses are the same address, allowing for the fact that one of
 * them came off a different office's keyboard.
 *
 * This guards the statewide value lookup, which finds a parcel by where it is
 * rather than by what it is called: the Department of Revenue's row has to
 * agree with the address the reader picked, or the figure belongs to the house
 * next door and nothing on the screen would say so.
 *
 * So the whole street has to agree, word for word, and not merely its first
 * word — 400 S Orange Ave and 400 S Orange Blossom Trl are both real Orlando
 * addresses at the same number. Street types are dropped before comparing,
 * because one office writes Trl where another writes Trail, and an
 * abbreviation is allowed to stand for the word it opens. Anything less
 * certain than that is answered with no figure rather than a plausible one.
 */
export function addressesAgree(a: string, b: string): boolean {
  const left = parseTypedAddress(a);
  const right = parseTypedAddress(b);

  if (!left.number || !right.number || left.number !== right.number) return false;

  // A directional on both sides has to agree; on one side only it is missing
  // information rather than a contradiction.
  if (left.directional && right.directional && left.directional !== right.directional) {
    return false;
  }

  const named = (parsed: TypedAddress) => {
    const unitAt = parsed.street.findIndex((token) => UNIT_MARKERS.has(token));
    const street = unitAt >= 0 ? parsed.street.slice(0, unitAt) : parsed.street;
    const withoutTypes = street.filter((token) => !STREET_TYPES.has(token));
    // A street called nothing but a type word — Park Way, The Circle — keeps it.
    return withoutTypes.length > 0 ? withoutTypes : street;
  };

  const leftStreet = named(left);
  const rightStreet = named(right);

  if (leftStreet.length === 0 || rightStreet.length === 0) return false;

  // One side carrying a bare unit on the end — "1200 BRICKELL AVE 100-A" — is
  // still the same address. Two extra words would be a different street.
  const [shortSide, longSide] =
    leftStreet.length <= rightStreet.length ? [leftStreet, rightStreet] : [rightStreet, leftStreet];
  const extra = longSide.slice(shortSide.length);
  if (extra.length > 2 || extra.some((token) => token.length > 5)) return false;
  if (extra.length > 0 && !shortSide.every((token, index) => token === longSide[index])) {
    return false;
  }

  // Where both sides name a street type, it has to be the same type: 100 Park
  // Ave and 100 Park Way are different addresses that the comparison below,
  // which ignores types, would otherwise call equal.
  const typeOf = (parsed: TypedAddress) => {
    const last = parsed.street[parsed.street.length - 1];
    return last ? STREET_TYPE_CANON[last] : undefined;
  };
  const leftType = typeOf(left);
  const rightType = typeOf(right);
  if (leftType && rightType && leftType !== rightType) return false;

  return shortSide.every((token, index) => {
    const other = longSide[index];
    // The same word is the same word, however short. A street that ends in a
    // directional — "1832 Manatee Ave E" — is one letter, and the abbreviation
    // rule below would otherwise refuse to match it against itself.
    if (token === other) return true;

    const [shorter, longer] = token.length <= other.length ? [token, other] : [other, token];
    return shorter.length >= 2 && longer.startsWith(shorter);
  });
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
  return normalizeForMatch(raw)
    .split(' ')
    .map((token) => STREET_TYPE_CANON[token] ?? token)
    .join(' ');
}

/**
 * How well a row off a roll answers what was typed. 1 is "this is what they
 * were typing", 0 is "show something else".
 *
 * A prefix match wins and the shortest prefix match wins hardest, so typing
 * "100 Worth Ave" puts "100 WORTH AVE" above "100 WORTH AVE PH 14" rather than
 * burying it under thirty condominium units.
 */
export function scoreAddressMatch(typed: string, candidate: string): number {
  const wanted = normalizeForMatch(typed);
  const got = normalizeForMatch(candidate);

  if (!wanted || !got) return 0;
  if (got === wanted) return 1;
  if (got.startsWith(wanted)) return 0.9 - Math.min(got.length - wanted.length, 40) / 400;

  const wantedTokens = wanted.split(' ');
  const gotTokens = new Set(got.split(' '));
  const hits = wantedTokens.filter((token) => gotTokens.has(token)).length;

  return (hits / wantedTokens.length) * 0.5;
}

/** Roman-numeral-free title case for a roll's shouting: "1409 NW 48TH ST" -> "1409 NW 48th St". */
export function formatAddressForDisplay(raw: string): string {
  return normalizeAddressText(raw)
    .split(' ')
    .map((token) => {
      if (DIRECTIONALS.has(token)) return token;
      if (/^\d+(ST|ND|RD|TH)$/.test(token)) return token.toLowerCase();
      if (/^\d/.test(token)) return token;
      return token.charAt(0) + token.slice(1).toLowerCase();
    })
    .join(' ');
}

/** Title case for a city or county name off a roll, where every word is a word. */
export function formatPlaceForDisplay(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/(^|[\s\-/])([a-z])/g, (_, lead: string, letter: string) => lead + letter.toUpperCase());
}
