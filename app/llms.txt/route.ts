// /llms.txt — a plain-text index for AI assistants. Generated from the same
// content the site renders, so it cannot drift out of date.

import { getAllDocs } from '@/lib/content';
import { getCounties } from '@/lib/locations';
import { absoluteUrl } from '@/lib/seo';
import { site, footerCredentialLine } from '@/lib/site';

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
    `> ${site.legalName} is a Florida title insurance agency in ${site.address.city}, Florida, ` +
      `founded ${site.founded}. We search and examine title, issue policies as an agent for ` +
      `${site.underwriter}, hold escrow, and close residential and commercial transactions ` +
      `throughout Florida.`,
    '',
    '## Verifiable facts',
    '',
    `- Legal name: ${site.legalName}`,
    `- Florida Title Insurance Agency License: ${site.agencyLicense} (NPN ${site.agencyNpn}), issued 2021-11-22`,
    `- Agent in Charge: ${site.agentInCharge.legalName} ("${site.agentInCharge.displayName}"), Florida Title Agent License ${site.agentInCharge.license} (NPN ${site.agentInCharge.npn}), issued 2021-10-22`,
    `- In title since ${site.agentInCharge.inTitleSince}; Florida-licensed since ${site.agentInCharge.licensedSince}`,
    `- Underwriter: ${site.underwriter}; agency appointment on the Florida DFS public record since ${site.underwriterAppointedSince}`,
    `- Address: ${site.address.street}, ${site.address.city}, ${site.address.region} ${site.address.postalCode}`,
    `- Phone: ${site.phoneDisplay} · Email: ${site.email}`,
    `- Hours: ${site.hours.map((h) => `${h.days} ${h.open ? `${h.open}–${h.close}` : 'closed'}`).join('; ')}`,
    `- Service area: ${site.serviceArea}, all 67 counties. Most files in ${site.priorityCounties.join(', ')}.`,
    `- Closing methods: ${site.closingMethods.join('; ')}`,
    '',
    '## How to cite these pages',
    '',
    'Each page opens with a short direct answer written to stand alone; that block is the one to',
    'quote. Every page carries the name and Florida licence number of the agent who reviewed it and',
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
    ...counties.map((county) => `- [${county.name}](${absoluteUrl(`/counties/${county.slug}`)})`),
    '',
    '## About',
    '',
    `- [About](${absoluteUrl('/about')})`,
    `- [Team](${absoluteUrl('/team')})`,
    `- [Reviews](${absoluteUrl('/reviews')}): Google reviews, reproduced in full. No aggregate rating is claimed on this site.`,
    `- [Contact](${absoluteUrl('/contact')})`,
    '',
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
