import type { Metadata } from 'next';
import Link from 'next/link';

import { team } from '@/lib/team';
import { site } from '@/lib/site';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PersonSchema } from '@/components/Schema';
import { QuietCta } from '@/components/QuietCta';
import { siteOpenGraph, metaDescription } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Our team: Florida-licensed title agent and notaries',
  description: metaDescription(
    `The four people who work every file at ${site.legalName} in ${site.address.city}, with ` +
      'their Florida title agent license and notary commission numbers.',
  ),
  alternates: { canonical: '/team' },
  openGraph: { ...siteOpenGraph, url: '/team' },
};

export default function TeamPage() {
  return (
    <div className="frame section">
      <div className="measure">
        <Breadcrumbs
          trail={[
            { name: 'Home', path: '/' },
            { name: 'Our team', path: '/team' },
          ]}
        />
        <h1 className="after-crumbs">Who works your file</h1>
        <p className="lede">
          Four people, all in the {site.address.city} office. The same processor and the same closer
          handle a file from opening to recording, so the person you reach already knows it.
        </p>

        {team.map((member) => (
          <section key={member.slug} className="team-entry">
            <PersonSchema
              name={member.name}
              role={member.role}
              credential={member.credential}
              slug={member.slug}
              linkedin={member.linkedin}
            />
            <h2 className="flush-top">
              <Link href={`/team/${member.slug}`} className="link-quiet">
                {member.name}
              </Link>
            </h2>
            <p className="eyebrow eyebrow--after-title">
              {member.role}
            </p>
            {member.bio?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {member.publicRecord.length > 0 ? (
              <ul className="ui muted text-small">
                {member.publicRecord.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}

        <QuietCta text="Send us the address and the contract date and one of the four of us will tell you what the search shows." />
      </div>
    </div>
  );
}
