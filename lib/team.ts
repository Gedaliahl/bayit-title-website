import { site } from './site';

/**
 * Team detail beyond the canonical facts in site.ts.
 *
 * `bio` is intentionally null for three of four members. Each person writes
 * their own two or three sentences; nothing here is written on their behalf.
 * A null bio renders as an omitted section, not as invented copy.
 */
export interface TeamMember {
  slug: string;
  name: string;
  role: string;
  credential: string | null;
  /** Verifiable licence or commission detail, stated exactly as the public record has it. */
  publicRecord: string[];
  bio: string | null;
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
    bio: null,
  },
  {
    slug: 'chaya',
    name: 'Chaya Brooks',
    role: 'Closer',
    credential: 'Florida Notary Public, Commission HH 817398',
    publicRecord: ['Florida Notary Public, Commission HH 817398, expires June 24, 2030'],
    bio: null,
  },
];

export function getTeamMember(slug: string): TeamMember | undefined {
  return team.find((member) => member.slug === slug);
}
