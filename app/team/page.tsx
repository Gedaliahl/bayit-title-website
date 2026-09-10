import type { Metadata } from 'next';
import Link from 'next/link';

import { team } from '@/lib/team';
import { site } from '@/lib/site';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PersonSchema } from '@/components/Schema';

export const metadata: Metadata = {
  title: 'Our team',
  description: `The four people who work every file at ${site.legalName}, with their Florida licence and commission numbers.`,
  alternates: { canonical: '/team' },
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
        <h1 style={{ marginTop: '1.5rem' }}>Who works your file</h1>
        <p className="lede">
          Four people, all in the {site.address.city} office. The same processor and the same closer
          handle a file from opening to recording, so the person you reach already knows it.
        </p>

        {team.map((member) => (
          <section key={member.slug} style={{ marginTop: '2.5rem' }}>
            <PersonSchema
              name={member.name}
              role={member.role}
              credential={member.credential}
              slug={member.slug}
              linkedin={member.linkedin}
            />
            <h2 style={{ marginTop: 0 }}>
              <Link href={`/team/${member.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                {member.name}
              </Link>
            </h2>
            <p className="eyebrow" style={{ marginTop: '-0.35rem' }}>
              {member.role}
            </p>
            {member.bio ? <p>{member.bio}</p> : null}
            {member.publicRecord.length > 0 ? (
              <ul className="ui muted" style={{ fontSize: '0.875rem' }}>
                {member.publicRecord.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
