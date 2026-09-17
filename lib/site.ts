// Canonical facts. Every one of these is verified against a public record
// (FL DFS licensee search, FL Dept. of State notary search).
// Nothing here may be paraphrased into a new claim. See claude-project-brief.md.

export const site = {
  name: 'Bayit Title',
  legalName: 'Bayit Title LLC',
  // www, not the apex. The Wix site is canonical on www and 301s the apex to
  // it, so every indexed URL and inbound link already points there. Moving the
  // canonical host at cutover would put a needless redirect hop in front of the
  // whole existing index. Vercel must have www set as the primary domain.
  url: 'https://www.bayittitle.com',

  agencyLicense: 'W806540',
  agencyNpn: '20152864',
  agentInCharge: {
    legalName: 'Batsheva Lowenstein',
    displayName: 'Shevy Lowenstein',
    license: 'W766033',
    npn: '19304095',
    licensedSince: '2021',   // Florida license issued 2021-10-22
    inTitleSince: '2017',    // never write "Florida licensed since 2017"
    linkedin: 'https://www.linkedin.com/in/shevy-lowenstein-25404922a/',
  },
  underwriter: 'First American Title Insurance Company',
  underwriterAppointedSince: '2021-12-09',

  address: {
    street: '3301 N University Drive, Suite 100',
    city: 'Coral Springs',
    region: 'FL',
    postalCode: '33065',
    country: 'US',
  },
  geo: { lat: 26.2719844, lng: -80.2496001 },
  phone: '+1-754-253-2270',
  phoneDisplay: '754.253.2270',
  email: 'shevy@bayittitle.com',

  // Where website orders and quote requests are routed for now. Revisit when
  // a production system (Qualia / SoftPro / ResWare) is chosen.
  ordersEmail: 'shevy@bayittitle.com',

  // In-office, mobile/concierge anywhere the signer wants, and RON.
  closingMethods: ['In-office signing', 'Mobile signing, wherever you are', 'Remote online notarization'],

  // Google Business Profile. Place ID confirmed from Google Places.
  googlePlaceId: 'ChIJk9WlCCUF2YgRgJbY8DFTw_A',
  googleProfileUrl:
    'https://www.google.com/maps/place/?q=place_id:ChIJk9WlCCUF2YgRgJbY8DFTw_A',

  // Every profile that represents Bayit Title. Feeds the sameAs schema, which
  // is how search engines and AI assistants confirm this is one entity.
  // Add the rest as they're confirmed: Shevy's personal LinkedIn, Facebook,
  // ALTA and FLTA directory listings, First American agent locator.
  profiles: [
    'https://www.linkedin.com/company/bayittitle',
    'https://www.instagram.com/bayittitle',
  ],

  // From the Google Business Profile. Keep in sync with GBP, not the other way round.
  hours: [
    { days: 'Monday – Friday', open: '9:00 AM', close: '5:00 PM' },
    { days: 'Saturday – Sunday', open: null, close: null },
  ],

  // Emphasis first, then the rest of the state. Every slug here must exist in
  // the locations table, or the county page it links to is a 404 — see
  // supabase/seed/locations_priority_counties.sql.
  priorityCounties: [
    'Broward County',
    'Palm Beach County',
    'Miami-Dade County',
    'Hillsborough County',
    'Orange County',
    'Duval County',
  ],
  serviceArea: 'Florida',

  // Florida has 67 counties and the agency closes in all of them, so this is
  // the count of the state, not a claim about volume.
  floridaCounties: 67,

  // A 1031 exchange needs a qualified intermediary, and the intermediary cannot
  // be the taxpayer's agent for the sale. So it is a separate company, named
  // here rather than blurred into "we handle 1031s".
  //
  // It shares the Bayit name and does not share the ownership, which a reader
  // would not guess and is therefore said out loud wherever it comes up. It is
  // not an affiliated business arrangement: there is no common ownership to
  // disclose, and the site must not describe one.
  exchangeCompany: {
    name: 'Bayit Exchange Company',
    relationship: 'a separate company under different ownership',
  },

  team: [
    { slug: 'shevy',    name: 'Shevy Lowenstein',    role: 'Founder',                 credential: 'Florida Title Agent, License W766033' },
    { slug: 'gedaliah', name: 'Gedaliah Lowenstein', role: 'Chief Operating Officer', credential: null },
    { slug: 'jennifer', name: 'Jennifer Simon',      role: 'Processor',               credential: 'Florida Notary Public, Commission HH 795313' },
    { slug: 'chaya',    name: 'Chaya Brooks',        role: 'Closer',                  credential: 'Florida Notary Public, Commission HH 817398' },
  ],
} as const;

/**
 * The hours, as one sentence. Several pages said this by reaching for
 * `site.hours[0]` and `site.hours[1]` by index, which broke the moment the two
 * weekday rows became one. Hours change; the sentence should change with them.
 */
export const officeHoursLine = site.hours
  .filter((entry) => entry.open !== null)
  .map((entry) => `${entry.days}, ${entry.open} to ${entry.close}`)
  .join('; ');

/**
 * The underwriter credit, in the one wording used everywhere it appears: the
 * hero's underwriter badge and the footer's credential line both read from
 * here, so the sentence cannot drift between the two.
 */
export const underwriterLine = `Policies underwritten by ${site.underwriter}`;

export const footerCredentialLine =
  `${site.legalName} · Florida Title Insurance Agency License ${site.agencyLicense} · ` +
  `Agent in Charge: ${site.agentInCharge.legalName}, License ${site.agentInCharge.license} · ` +
  underwriterLine;
