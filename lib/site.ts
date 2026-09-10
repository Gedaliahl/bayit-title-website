// Canonical facts. Every one of these is verified against a public record
// (FL DFS licensee search, FL Dept. of State notary search).
// Nothing here may be paraphrased into a new claim. See claude-project-brief.md.

export const site = {
  name: 'Bayit Title',
  legalName: 'Bayit Title LLC',
  url: 'https://bayittitle.com',
  founded: '2021',

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
    { days: 'Monday – Thursday', open: '9:00 AM', close: '5:00 PM' },
    { days: 'Friday', open: '9:00 AM', close: '12:00 PM' },
    { days: 'Saturday – Sunday', open: null, close: null },
  ],

  // Emphasis first, then the rest of the state.
  priorityCounties: ['Broward County', 'Palm Beach County', 'Miami-Dade County'],
  serviceArea: 'Florida',

  team: [
    { slug: 'shevy',    name: 'Shevy Lowenstein',    role: 'Founder',                 credential: 'Florida Title Agent, License W766033' },
    { slug: 'gedaliah', name: 'Gedaliah Lowenstein', role: 'Chief Operating Officer', credential: null },
    { slug: 'jennifer', name: 'Jennifer Simon',      role: 'Processor',               credential: 'Florida Notary Public, Commission HH 795313' },
    { slug: 'chaya',    name: 'Chaya Brooks',        role: 'Closer',                  credential: 'Florida Notary Public, Commission HH 817398' },
  ],
} as const;

export const footerCredentialLine =
  `${site.legalName} · Florida Title Insurance Agency License ${site.agencyLicense} · ` +
  `Agent in Charge: ${site.agentInCharge.legalName}, License ${site.agentInCharge.license} · ` +
  `Policies underwritten by ${site.underwriter}`;
