import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { team, getTeamMember } from '@/lib/team';
import { getReviews } from '@/lib/reviews';
import { site } from '@/lib/site';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PersonSchema } from '@/components/Schema';
import { ReviewList } from '@/components/Reviews';
import { QuietCta } from '@/components/QuietCta';
import {
  baseOpenGraph,
  fittedTitle,
  indexingAllowed,
  metaDescription,
  teamPageHasContent,
} from '@/lib/seo';

export const dynamicParams = false;

export function generateStaticParams() {
  return team.map((member) => ({ slug: member.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const member = getTeamMember(slug);
  if (!member) return {};

  // Name and role alone is what /team already says. The page stays reachable
  // from there, but out of the index until it has something of its own.
  const hasContent = teamPageHasContent(member, await getReviews());

  return {
    title: fittedTitle(`${member.name}, ${member.role}`),
    description: metaDescription(
      `${member.name} is ${member.role} at ${site.legalName} in ${site.address.city}, Florida.`,
    ),
    alternates: { canonical: `/team/${member.slug}` },
    openGraph: { ...baseOpenGraph, url: `/team/${member.slug}` },
    // Its links are still followed where the site is open to crawlers at all.
    ...(hasContent ? {} : { robots: { index: false, follow: indexingAllowed() } }),
  };
}

export default async function TeamMemberPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const member = getTeamMember(slug);
  if (!member) notFound();

  const allReviews = await getReviews();
  const named = allReviews.filter((review) => review.teamMemberSlug === member.slug).slice(0, 6);

  return (
    <div className="frame section">
      <PersonSchema
        name={member.name}
        role={member.role}
        credential={member.credential}
        slug={member.slug}
        linkedin={member.linkedin}
      />
      <div className="measure">
        <Breadcrumbs
          trail={[
            { name: 'Home', path: '/' },
            { name: 'Our team', path: '/team' },
            { name: member.name, path: `/team/${member.slug}` },
          ]}
        />
        <h1 className="after-crumbs">{member.name}</h1>
        <p className="eyebrow eyebrow--after-title">
          {member.role}
        </p>

        {/* The opening paragraph carries the page, so it reads as the lede. */}
        {member.bio?.map((paragraph, index) => (
          <p key={paragraph} className={index === 0 ? 'lede' : undefined}>
            {paragraph}
          </p>
        ))}

        {member.publicRecord.length > 0 ? (
          <>
            <h2>On the public record</h2>
            <ul>
              {member.publicRecord.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
            <p className="form-note">
              License status can be confirmed through the{' '}
              <a href={site.dfsLicenseeSearchUrl}>
                Florida Department of Financial Services licensee search
              </a>
              ; notary commissions through the Florida Department of State.
            </p>
          </>
        ) : null}

        {member.linkedin ? (
          <p>
            <a href={member.linkedin} rel="noopener">
              LinkedIn
            </a>
          </p>
        ) : null}

        {named.length > 0 ? (
          <section>
            <h2>Reviews that mention {member.name.split(' ')[0]}</h2>
            <ReviewList reviews={named} />
          </section>
        ) : null}

        <QuietCta />
      </div>
    </div>
  );
}
