// What each city says, on its own website, about the things a title search
// cannot see: its permit records, its code enforcement cases and the liens
// they become, how those liens are released, who answers a municipal lien
// search and who bills the water.
//
// The rule here is the one the whole site follows. Every statement is the
// city's own words, quoted, with the URL it was read from and the date. Where
// a city publishes nothing on a point — or its site refused an automated
// request — the field is null and the page says the fact is withheld, rather
// than carrying something that sounds right. A city that publishes nothing
// about lien reduction does not get a paragraph about lien reduction.
//
// What is the same in every city — the fine caps, what makes a fine a lien,
// how long it lasts, who may release it — is Chapter 162 of the statutes and
// lives in lib/code-enforcement.ts. This file is only what varies.
//
// Every record was compiled from the city's site on 2026-09-20. The CSV the
// city list is drawn from, the statute text and each city page fetched are in
// the session's scratch directory, not the repo; the URLs here are the record.

/** A sentence or two of a city's own copy, and where it was read. */
export interface CityQuote {
  text: string;
  sourceUrl: string;
  /** The date the page was read, ISO. */
  checkedOn: string;
}

/** A named office and its page. */
export interface CityOffice {
  name: string;
  url: string;
}

export interface MunicipalRecord {
  citySlug: string;
  /** How the municipality names itself, without an article: "City of Miami". */
  government: string;

  /** The building department: where permit status is searched, and what the city says about expired permits. */
  building: {
    office: CityOffice;
    /** The public permit search, by the name the city gives it. */
    portal: CityOffice | null;
    /** What the city publishes about an expired, inactive or open permit. */
    expiredPermits: CityQuote | null;
  } | null;

  /** Code enforcement: who hears the case, what the city says about liens, and how one is released. */
  codeEnforcement: {
    office: CityOffice;
    /** The city naming its hearing body — a special magistrate or a code enforcement board. */
    hearingBody: CityQuote | null;
    /** The city on fines becoming liens. */
    liens: CityQuote | null;
    /** The city's published route for a lien to be released, reduced or settled. */
    release: CityQuote | null;
  } | null;

  /** The municipal lien search: who answers it and on what terms. */
  lienSearch: {
    office: CityOffice;
    /**
     * Whether the answer comes from the city itself, from a county office, or
     * from a vendor the city contracts — or 'self-service', where the city
     * publishes no lien-search service and what it offers is its own lookups.
     */
    answeredBy: 'city' | 'county' | 'vendor' | 'self-service';
    /** How the request is made, in the city's words. */
    how: CityQuote | null;
    fee: CityQuote | null;
    turnaround: CityQuote | null;
  } | null;

  /** Who bills water and sewer inside the city, and what it says about balances at sale. */
  utility: {
    provider: CityOffice;
    statement: CityQuote | null;
  } | null;

  /** Anything else the city publishes that a closing touches: assessments, registrations, inspections on sale. */
  other: { label: string; quote: CityQuote }[];

  /** What a reader would get wrong from the fields alone: a site that refused requests, a vendor in the loop. */
  notes: string | null;
}

export { MUNICIPAL_RECORDS } from './municipal-records.data';
import { MUNICIPAL_RECORDS } from './municipal-records.data';

export function municipalRecord(citySlug: string): MunicipalRecord | null {
  return MUNICIPAL_RECORDS.find((record) => record.citySlug === citySlug) ?? null;
}

/**
 * The facts a city page would state and cannot, for the banner at the top.
 *
 * One line per missing fact, in the reader's terms. A city with no record at
 * all is missing every one of them.
 */
export function withheldMunicipalFacts(cityName: string, record: MunicipalRecord | null): string[] {
  const items: string[] = [];
  const government = `the ${record?.government ?? `City of ${cityName}`}`;

  if (!record?.building?.portal) items.push(`Where ${government} publishes permit status and history online`);
  if (!record?.building?.expiredPermits)
    items.push(`What ${government} publishes about closing or reinstating an expired permit`);
  if (!record?.codeEnforcement?.hearingBody)
    items.push(`Whether ${government} hears code cases before a special magistrate or a code enforcement board`);
  if (!record?.codeEnforcement?.release)
    items.push(`${government}’s published process for releasing or reducing a code enforcement lien`);
  if (!record?.lienSearch?.how) items.push(`How a municipal lien search is requested from ${government}`);
  // A city that publishes no lien-search service has no fee or turnaround to
  // withhold; the page says what it offers instead.
  if (record?.lienSearch?.answeredBy !== 'self-service') {
    if (!record?.lienSearch?.fee) items.push(`What ${government} charges for a municipal lien search`);
    if (!record?.lienSearch?.turnaround) items.push(`How long ${government} says a lien search takes`);
  }
  if (!record?.utility) items.push(`Who bills water and sewer inside ${cityName}`);

  return items;
}
