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
export function rollAddressPrefix(parsed: TypedAddress): string | null {
  if (!parsed.number) return null;

  const parts = [parsed.number];
  if (parsed.directional) parts.push(parsed.directional);

  for (const token of parsed.street) {
    parts.push(token);
    if (/^\d+$/.test(token)) break;
  }

  return parts.join(' ');
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
