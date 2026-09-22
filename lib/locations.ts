// County and city data. Read at build time with the service role; falls back to
// the canonical priority counties in lib/site.ts when Supabase is unconfigured,
// except on a build that is required to be complete — see
// `requireCompleteLocations` below.
import 'server-only';

import { cache } from 'react';
import { getServiceClient } from './supabase';
import { site } from './site';

export interface Location {
  slug: string;
  kind: 'county' | 'city';
  name: string;
  parentCountySlug: string | null;
  isPriority: boolean;
  clerkName: string | null;
  clerkUrl: string | null;
  propertyAppraiserUrl: string | null;
  taxCollectorUrl: string | null;
  /** Who customarily pays for the owner's policy. Null until verified. */
  customaryOwnerPolicyPayer: string | null;
  /**
   * Whose published statement the custom is. Custom is not law and, unless
   * the team stated it from its own files, not this office's observation, so
   * the page says whose it is and when it was read. Null where the team set
   * the payer directly.
   */
  customaryOwnerPolicyPayerSourceName: string | null;
  customaryOwnerPolicyPayerSourceUrl: string | null;
  customaryOwnerPolicyPayerCheckedOn: string | null;
  /**
   * A sentence where one word will not do. Monroe: the custom depends on
   * where in the Keys the property is, so `payer` is null and this says why.
   */
  customaryOwnerPolicyDetail: string | null;
  eRecordingAvailable: boolean | null;
  /**
   * What this county's recording office publishes about how long recording
   * takes, in its own words. Null where the office publishes nothing — which is
   * 42 of the 67 counties. Never fill this from an industry average or a
   * recorder-directory site; see docs/county-recording-turnaround.md.
   */
  recordingTurnaround: string | null;
  recordingTurnaroundSourceUrl: string | null;
  recordingTurnaroundCheckedOn: string | null;
  notes: string | null;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Used when Supabase is unavailable so county links never 404 at build time. */
function fallbackCounties(): Location[] {
  return site.priorityCounties.map((name) => ({
    slug: slugify(name),
    kind: 'county' as const,
    name,
    parentCountySlug: null,
    isPriority: true,
    clerkName: null,
    clerkUrl: null,
    propertyAppraiserUrl: null,
    taxCollectorUrl: null,
    customaryOwnerPolicyPayer: null,
    customaryOwnerPolicyPayerSourceName: null,
    customaryOwnerPolicyPayerSourceUrl: null,
    customaryOwnerPolicyPayerCheckedOn: null,
    customaryOwnerPolicyDetail: null,
    eRecordingAvailable: null,
    recordingTurnaround: null,
    recordingTurnaroundSourceUrl: null,
    recordingTurnaroundCheckedOn: null,
    notes: null,
  }));
}

/**
 * Whether this build must have every county, or fail.
 *
 * The fallback is six counties. A build that takes it ships six county pages
 * instead of sixty-seven, the other sixty-one return 404 and drop out of the
 * sitemap, and nothing fails — one such deploy to production could de-index
 * most of the county pages. So the production deployment refuses it, and so
 * does any CI build that sets REQUIRE_LOCATIONS=1 to catch the problem before
 * a deploy does. Development and preview builds keep the fallback, loudly, so
 * the site still runs without credentials.
 */
export function requireCompleteLocations(): boolean {
  return process.env.VERCEL_ENV === 'production' || process.env.REQUIRE_LOCATIONS === '1';
}

/**
 * Says why this build does not have every county, and fails it if it must.
 * `consequence` is what the reader of the site would get instead.
 */
const reported = new Set<string>();

function reportIncomplete(reason: string, consequence: string): void {
  const message = `[locations] ${reason} ${consequence}`;
  if (requireCompleteLocations()) {
    throw new Error(
      `${message} This build requires all ${site.floridaCounties} counties ` +
        '(VERCEL_ENV=production or REQUIRE_LOCATIONS=1).',
    );
  }
  // Every page asks for the locations, so without this one build prints the
  // same warning dozens of times and buries everything else in the log.
  if (reported.has(message)) return;
  reported.add(message);
  console.warn(`${message} Building anyway; a production build would fail here.`);
}

const FALLBACK_CONSEQUENCE =
  `The fallback has only the ${site.priorityCounties.length} priority counties, so every other ` +
  'county page would 404 and drop out of the sitemap.';

export const getLocations = cache(async (): Promise<Location[]> => {
  const supabase = getServiceClient();
  if (!supabase) {
    reportIncomplete('Supabase is not configured.', FALLBACK_CONSEQUENCE);
    return fallbackCounties();
  }

  const { data, error } = await supabase
    .from('locations')
    // Single string literal on purpose — see the note in lib/reviews.ts.
    .select(
      'slug, kind, name, parent_county_slug, is_priority, clerk_name, clerk_url, property_appraiser_url, tax_collector_url, customary_owner_policy_payer, customary_owner_policy_payer_source_name, customary_owner_policy_payer_source_url, customary_owner_policy_payer_checked_on, customary_owner_policy_detail, e_recording_available, recording_turnaround, recording_turnaround_source_url, recording_turnaround_checked_on, notes',
    )
    .order('is_priority', { ascending: false })
    .order('name');

  if (error || !data) {
    reportIncomplete(
      `The locations fetch failed: ${error?.message ?? 'no data returned'}.`,
      FALLBACK_CONSEQUENCE,
    );
    return fallbackCounties();
  }

  // An empty array is truthy, so it would otherwise sail past the check above
  // and return no counties at all — generateStaticParams would emit no routes
  // and every county URL would 404. The table is seeded, so empty means the
  // rows were filtered out rather than absent: almost always the anon key in
  // place of the service role key, where RLS returns zero rows and no error.
  if (data.length === 0) {
    reportIncomplete(
      'The query returned zero rows. The table is seeded, so this usually means ' +
        'SUPABASE_SERVICE_ROLE_KEY holds the anon key: RLS then filters every row and reports no error.',
      FALLBACK_CONSEQUENCE,
    );
    return fallbackCounties();
  }

  // A partial table is the same failure by degrees: every county missing from
  // it is a page that 404s. Here the rows that did come back are kept, since
  // they are real, and only a required build refuses them.
  const countyRows = data.filter((row) => row.kind === 'county').length;
  if (countyRows < site.floridaCounties) {
    reportIncomplete(
      `The locations table has ${countyRows} of the ${site.floridaCounties} counties.`,
      'The missing county pages would 404.',
    );
  }

  return data.map((row) => ({
    slug: row.slug,
    kind: row.kind,
    name: row.name,
    parentCountySlug: row.parent_county_slug,
    isPriority: row.is_priority,
    clerkName: row.clerk_name,
    clerkUrl: row.clerk_url,
    propertyAppraiserUrl: row.property_appraiser_url,
    taxCollectorUrl: row.tax_collector_url,
    customaryOwnerPolicyPayer: row.customary_owner_policy_payer,
    customaryOwnerPolicyPayerSourceName: row.customary_owner_policy_payer_source_name,
    customaryOwnerPolicyPayerSourceUrl: row.customary_owner_policy_payer_source_url,
    customaryOwnerPolicyPayerCheckedOn: row.customary_owner_policy_payer_checked_on,
    customaryOwnerPolicyDetail: row.customary_owner_policy_detail,
    eRecordingAvailable: row.e_recording_available,
    recordingTurnaround: row.recording_turnaround,
    recordingTurnaroundSourceUrl: row.recording_turnaround_source_url,
    recordingTurnaroundCheckedOn: row.recording_turnaround_checked_on,
    notes: row.notes,
  }));
});

/**
 * Where in the state a county is, for the label on its card.
 *
 * Only the counties that get a card — the ones lib/site.ts calls priority. It
 * is a region name rather than a claim about the office, so it does not belong
 * in the locations table beside the clerk and appraiser facts that are checked
 * against a public record.
 */
export const COUNTY_REGIONS: Record<string, string> = {
  'broward-county': 'South Florida',
  'palm-beach-county': 'South Florida',
  'miami-dade-county': 'South Florida',
  'hillsborough-county': 'Tampa Bay',
  'pinellas-county': 'Tampa Bay',
  'orange-county': 'Central Florida',
  'polk-county': 'Central Florida',
  'duval-county': 'Northeast Florida',
  'brevard-county': 'Space Coast',
  'lee-county': 'Southwest Florida',
  'collier-county': 'Southwest Florida',
  'sarasota-county': 'Southwest Florida',
};

/**
 * The place a reader names when they mean the county.
 *
 * A search is "title company Tampa", not "title company Hillsborough County",
 * so the county page's title carries the market the county is known by. This
 * is the name of the largest city or pair of cities in the county — a fact
 * about where people live, not a claim about the office or its volume there,
 * which is why it sits beside the region label rather than in the table.
 */
export const COUNTY_MARKETS: Record<string, string> = {
  'alachua-county': 'Gainesville',
  'baker-county': 'Macclenny',
  'bay-county': 'Panama City',
  'bradford-county': 'Starke',
  'brevard-county': 'Melbourne and Palm Bay',
  'broward-county': 'Fort Lauderdale',
  'calhoun-county': 'Blountstown',
  'charlotte-county': 'Punta Gorda and Port Charlotte',
  'citrus-county': 'Inverness and Crystal River',
  'clay-county': 'Orange Park',
  'collier-county': 'Naples',
  'columbia-county': 'Lake City',
  'desoto-county': 'Arcadia',
  'dixie-county': 'Cross City',
  'duval-county': 'Jacksonville',
  'escambia-county': 'Pensacola',
  'flagler-county': 'Palm Coast',
  'franklin-county': 'Apalachicola',
  'gadsden-county': 'Quincy',
  'gilchrist-county': 'Trenton',
  'glades-county': 'Moore Haven',
  'gulf-county': 'Port St. Joe',
  'hamilton-county': 'Jasper',
  'hardee-county': 'Wauchula',
  'hendry-county': 'LaBelle and Clewiston',
  'hernando-county': 'Spring Hill and Brooksville',
  'highlands-county': 'Sebring',
  'hillsborough-county': 'Tampa',
  'holmes-county': 'Bonifay',
  'indian-river-county': 'Vero Beach',
  'jackson-county': 'Marianna',
  'jefferson-county': 'Monticello',
  'lafayette-county': 'Mayo',
  'lake-county': 'Clermont and Leesburg',
  'lee-county': 'Fort Myers and Cape Coral',
  'leon-county': 'Tallahassee',
  'levy-county': 'Chiefland and Williston',
  'liberty-county': 'Bristol',
  'madison-county': 'Madison',
  'manatee-county': 'Bradenton',
  'marion-county': 'Ocala',
  'martin-county': 'Stuart',
  'miami-dade-county': 'Miami',
  'monroe-county': 'Key West',
  'nassau-county': 'Fernandina Beach',
  'okaloosa-county': 'Fort Walton Beach and Destin',
  'okeechobee-county': 'Okeechobee',
  'orange-county': 'Orlando',
  'osceola-county': 'Kissimmee',
  'palm-beach-county': 'West Palm Beach and Boca Raton',
  'pasco-county': 'New Port Richey and Wesley Chapel',
  'pinellas-county': 'St. Petersburg and Clearwater',
  'polk-county': 'Lakeland',
  'putnam-county': 'Palatka',
  'st-johns-county': 'St. Augustine',
  'st-lucie-county': 'Port St. Lucie',
  'santa-rosa-county': 'Milton and Navarre',
  'sarasota-county': 'Sarasota',
  'seminole-county': 'Sanford and Altamonte Springs',
  'sumter-county': 'The Villages',
  'suwannee-county': 'Live Oak',
  'taylor-county': 'Perry',
  'union-county': 'Lake Butler',
  'volusia-county': 'Daytona Beach and Deltona',
  'wakulla-county': 'Crawfordville',
  'walton-county': 'Santa Rosa Beach and DeFuniak Springs',
  'washington-county': 'Chipley',
};

/**
 * Who records, where the table does not name the office.
 *
 * Fla. Stat. § 28.222(1): "The clerk of the circuit court shall be the
 * recorder of all instruments that he or she may be required or authorized by
 * law to record in the county where he or she is clerk." Read from Online
 * Sunshine on 2026-09-20. Broward and Orange are the two counties where the
 * duty sits elsewhere, and both have their office named in the table, so the
 * fallback is only ever used where the statute's default holds.
 */
export const RECORDER_STATUTE = {
  cite: 'Fla. Stat. § 28.222(1)',
  url: 'https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0000-0099/0028/Sections/0028.222.html',
} as const;

/**
 * A recording office's turnaround, ready to set in a blockquote.
 *
 * Some rows store the office's words as a run of quoted sentences — `"We
 * cannot guarantee…" "Documents submitted…"` — because they were lifted from
 * two places on one page. Inside a blockquote those marks double up: the block
 * already says it is a quotation. When every part of the text is quoted, the
 * marks come off and the sentences run on. When the row mixes quoted words with
 * our own description of the page, the marks are what tell the two apart, so
 * they stay.
 */
export function turnaroundForQuote(text: string): string {
  const parts = text.trim().match(/"[^"]*"/g);
  if (!parts || parts.join('').replace(/\s/g, '') !== text.replace(/\s/g, '')) return text.trim();
  return parts.map((part) => part.slice(1, -1).trim()).join(' ');
}

/**
 * "a" or "an" before a place name, by how the name is said: an Orange County
 * file, an Orlando sale, a Union County deed. The templates wrote "a" before
 * every name, which put "a Orange County sale" into a heading on eight county
 * and city pages.
 */
export function aOrAn(name: string): 'a' | 'an' {
  if (/^u(ni|s[aeiou]|ti)/i.test(name)) return 'a';
  return /^[aeiou]/i.test(name) ? 'an' : 'a';
}

export function recorderName(county: Pick<Location, 'name' | 'clerkName'>): string {
  return county.clerkName ?? `${county.name} Clerk of the Circuit Court`;
}

/** "Title company in Hillsborough County, FL: Tampa closings" — the page title's shape. */
export function countyPageTitle(county: Pick<Location, 'slug' | 'name'>): string {
  const market = COUNTY_MARKETS[county.slug];
  return market
    ? `Title company in ${county.name}, FL: ${market} closings`
    : `Title company in ${county.name}, FL`;
}

export async function getCounties(): Promise<Location[]> {
  return (await getLocations()).filter((location) => location.kind === 'county');
}

export async function getLocation(slug: string): Promise<Location | null> {
  return (await getLocations()).find((location) => location.slug === slug) ?? null;
}
