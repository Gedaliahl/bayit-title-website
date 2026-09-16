import { site } from './site';

/**
 * Team detail beyond the canonical facts in site.ts.
 *
 * `bio` is null until the person has written their own two or three sentences.
 * Nothing here is written on anyone's behalf, and a null bio renders as an
 * omitted section rather than as invented copy. It is an array because a bio is
 * paragraphs as its author wrote them, not one run-on block.
 */
export interface TeamMember {
  slug: string;
  name: string;
  role: string;
  credential: string | null;
  /** Verifiable license or commission detail, stated exactly as the public record has it. */
  publicRecord: string[];
  bio: string[] | null;
  linkedin?: string;
}

export const team: TeamMember[] = [
  {
    slug: 'shevy',
    name: 'Shevy Lowenstein',
    role: 'Founder and Agent in Charge',
    credential: `Florida Title Agent, License ${site.agentInCharge.license}`,
    publicRecord: [
      `Florida Title Agent License ${site.agentInCharge.license}, issued October 22, 2021 (NPN ${site.agentInCharge.npn})`,
      `Agent in Charge for ${site.legalName}, Florida Title Insurance Agency License ${site.agencyLicense}`,
      `In title since ${site.agentInCharge.inTitleSince}. Florida-licensed since ${site.agentInCharge.licensedSince}.`,
    ],
    bio: null,
    linkedin: site.agentInCharge.linkedin,
  },
  {
    slug: 'gedaliah',
    name: 'Gedaliah Lowenstein',
    role: 'Chief Operating Officer',
    credential: null,
    publicRecord: [],
    bio: null,
  },
  {
    slug: 'jennifer',
    name: 'Jennifer Simon',
    role: 'Processor',
    credential: 'Florida Notary Public, Commission HH 795313',
    publicRecord: ['Florida Notary Public, Commission HH 795313, expires May 24, 2030'],
    // Jennifer's own words, as supplied. First person because they are hers.
    bio: [
      'I am a dedicated Real Estate Title Processor with several years of experience in the ' +
        'title industry. I enjoy managing the details behind each transaction, from reviewing ' +
        'title work and clearing requirements to coordinating with lenders, agents, and clients ' +
        'to help ensure a smooth closing. What I enjoy most about title processing is bringing ' +
        'all the moving pieces together and knowing my work helps make the closing process ' +
        'easier for everyone involved.',
    ],
  },
  {
    slug: 'chaya',
    name: 'Chaya Brooks',
    role: 'Closer',
    credential: 'Florida Notary Public, Commission HH 817398',
    publicRecord: ['Florida Notary Public, Commission HH 817398, expires June 24, 2030'],
    // Chaya's own words, as supplied. One copy edit: "insuring" to "ensuring",
    // which on a title insurance site reads as the wrong word rather than a typo.
    bio: [
      'Hi, I’m Chaya! The Closer at Bayit Title. I help coordinate signings, communicate ' +
        'with buyers, sellers, lenders, and notaries, and make sure everything stays on course ' +
        'throughout the closing process. I enjoy working through the details and ensuring ' +
        'things run smoothly.',
      'One thing I always want first-time buyers to know is that signing day doesn’t have ' +
        'to be a stressful event. I’m here to help answer any question and make the ' +
        'process as easy and comfortable as possible.',
    ],
  },
];

export function getTeamMember(slug: string): TeamMember | undefined {
  return team.find((member) => member.slug === slug);
}
