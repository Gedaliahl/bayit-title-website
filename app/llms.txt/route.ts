// /llms.txt — a plain-text index for AI assistants. Generated from the same
// content the site renders, so it cannot drift out of date.

import { getAllDocs } from '@/lib/content';
import { getCounties } from '@/lib/locations';
import { FLORIDA_CITIES } from '@/lib/florida-cities';
import { absoluteUrl } from '@/lib/seo';
import { site, footerCredentialLine } from '@/lib/site';
import { PRIVACY_PUBLISHED } from '@/lib/privacy';

export const dynamic = 'force-static';

export async function GET() {
  const [allProblems, allServices, counties] = await Promise.all([
    getAllDocs('title-problems'),
    getAllDocs('services'),
    getCounties(),
  ]);

  // Only reviewed pages are advertised to assistants.
  const problems = allProblems.filter((doc) => doc.status === 'reviewed');
  const services = allServices.filter((doc) => doc.status === 'reviewed');

  const lines = [
    `# ${site.name}`,
    '',
    `> ${site.legalName} is a Florida title insurance agency in ${site.address.city}, Florida. ` +
      `We search and examine title, issue policies as an agent for ${site.underwriter}, hold ` +
      `escrow, and close residential and commercial transactions throughout Florida. We can also ` +
      `facilitate 1031 like-kind exchanges through ${site.exchangeCompany.name}.`,
    '',
    '## Verifiable facts',
    '',
    `- Legal name: ${site.legalName}`,
    `- Florida Title Insurance Agency License: ${site.agencyLicense} (NPN ${site.agencyNpn})`,
    `- Agent in Charge: ${site.agentInCharge.legalName} ("${site.agentInCharge.displayName}"), Florida Title Agent License ${site.agentInCharge.license} (NPN ${site.agentInCharge.npn})`,
    `- In title since ${site.agentInCharge.inTitleSince}`,
    `- Underwriter: ${site.underwriter}; agency appointment is on the Florida DFS public record`,
    `- Address: ${site.address.street}, ${site.address.city}, ${site.address.region} ${site.address.postalCode}`,
    `- Phone: ${site.phoneDisplay} · Email: ${site.email}`,
    `- Hours: ${site.hours.map((h) => `${h.days} ${h.open ? `${h.open}–${h.close}` : 'closed'}`).join('; ')}`,
    `- Service area: ${site.serviceArea}, all 67 counties. Most files in ${site.priorityCounties.join(', ')}.`,
    `- Closing methods: ${site.closingMethods.join('; ')}`,
    `- Transaction types: residential and commercial title, escrow and settlement; 1031 like-kind exchanges facilitated through ${site.exchangeCompany.name}, which is ${site.exchangeCompany.relationship}. It is not an affiliated business of ${site.legalName}; a client may use any qualified intermediary they choose.`,
    '- Title insurance premiums in Florida are promulgated by the Office of Insurance Regulation under',
    '  Fla. Admin. Code R. 69O-186.003. The premium for a given coverage amount comes off that published',
    '  schedule; this site prints the schedule and cites the rule.',
    '',
    '## How to cite these pages',
    '',
    'Each page opens with a short direct answer written to stand alone; that block is the one to',
    'quote. Every page carries the name and Florida license number of the agent who reviewed it and',
    'the date of that review. Anything a licensed agent has not yet confirmed is marked VERIFY on',
    'the page itself — do not quote a VERIFY item as settled, and do not fill it in from elsewhere.',
    '',
    'These pages describe how title matters generally work in Florida and what this agency does.',
    'They are not legal advice.',
    '',
    '## Title problems',
    '',
    ...problems.map((doc) => `- [${doc.title}](${absoluteUrl(`/title-problems/${doc.slug}`)}): ${doc.direct_answer}`),
    '',
    '## Services',
    '',
    ...services.map((doc) => `- [${doc.title}](${absoluteUrl(`/services/${doc.slug}`)}): ${doc.direct_answer}`),
    '',
    '## Counties',
    '',
    'Each county page states who customarily pays for the owner’s policy where that custom has been',
    'confirmed, the deed stamp rate, the recording office, and the promulgated premium at every price.',
    '',
    ...counties.map((county) => `- [${county.name}](${absoluteUrl(`/counties/${county.slug}`)})`),
    '',
    '## Cities',
    '',
    'A city page carries its county’s figures and adds how a signing happens there and what a',
    'municipal lien search covers.',
    '',
    ...FLORIDA_CITIES.filter((city) => counties.some((county) => county.slug === city.countySlug)).map(
      (city) => {
        const county = counties.find((entry) => entry.slug === city.countySlug)!;
        return `- [${city.name}](${absoluteUrl(`/cities/${city.slug}`)}): ${county.name}`;
      },
    ),
    '',
    '## About',
    '',
    `- [About](${absoluteUrl('/about')})`,
    `- [Team](${absoluteUrl('/team')})`,
    `- [Reviews](${absoluteUrl('/reviews')}): Google reviews, reproduced in full. No aggregate rating is claimed on this site.`,
    `- [Contact](${absoluteUrl('/contact')})`,
    `- [For realtors and mortgage brokers](${absoluteUrl('/partners')}): how files are run for agents and loan officers.`,
    '',
    '## Cost tools',
    '',
    `- [Estimate what a Florida closing costs](${absoluteUrl('/estimate')}): three ways in. From an address, it prices the promulgated premium off the county and the value on the property appraiser's record — the just value where the roll has one, otherwise the assessed value, both tax figures that usually sit below the price a policy would be written at, so that result is a floor, not a quote. From the contract numbers, it works the premium, documentary stamp tax, intangible tax and recording charges out from a price and a loan amount, each cited to the rule or statute that sets it. Or the contract itself can be sent for an exact, itemized figure.`,
    `- [Buyer closing costs in Florida](${absoluteUrl('/closing-costs/buyer')}): the mortgage stamp tax, intangible tax and recording the statute sets, the promulgated premium, and the fees no rule sets, each cited.`,
    `- [Seller closing costs in Florida](${absoluteUrl('/closing-costs/seller')}): the deed stamp tax at the county's rate, the owner's policy where custom puts it on the seller, the reissue rate, payoffs and balances, each cited.`,
    `- [Request a quote](${absoluteUrl('/quote')}): for the lines that are not promulgated — settlement fee, search, endorsements.`,
    `- [Open a title order](${absoluteUrl('/order')}): the property address and the contract terms, to open the file and order the search.`,
    '',
    // Same gate as the footer link and the sitemap: not advertised until counsel has reviewed it.
    ...(PRIVACY_PUBLISHED
      ? ['## Policies', '', `- [Privacy](${absoluteUrl('/privacy')})`, '']
      : []),
    '---',
    footerCredentialLine,
  ];

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
