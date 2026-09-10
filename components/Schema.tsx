// JSON-LD. The point of this file is entity resolution: search engines and AI
// assistants need to confirm that bayittitle.com, the DFS licence record, the
// Google Business Profile and the LinkedIn company page are one entity.
//
// Deliberately absent: AggregateRating. The reviews were collected by Google,
// not on-site. Marking them up as our own rating risks a manual action.

import { site } from '@/lib/site';
import { absoluteUrl, SITE_URL } from '@/lib/seo';
import type { FaqItem } from '@/lib/faq';

function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Content is built from our own canonical data, not user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const AGENT_ID = `${SITE_URL}/team/${site.agentInCharge.displayName.split(' ')[0].toLowerCase()}#person`;

export function OrganizationSchema() {
  const openingHours = site.hours
    .filter((entry) => entry.open !== null)
    .map((entry) => {
      const days = entry.days.includes('–')
        ? entry.days.split('–').map((day) => day.trim())
        : [entry.days.trim()];
      return {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: days,
        opens: entry.open,
        closes: entry.close,
      };
    });

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': ['ProfessionalService', 'LocalBusiness'],
        '@id': ORGANIZATION_ID,
        name: site.name,
        legalName: site.legalName,
        url: SITE_URL,
        foundingDate: site.founded,
        description:
          `${site.legalName} is a Florida title insurance agency in ${site.address.city}, ` +
          `closing residential and commercial transactions throughout Florida.`,
        telephone: site.phone,
        email: site.email,
        address: {
          '@type': 'PostalAddress',
          streetAddress: site.address.street,
          addressLocality: site.address.city,
          addressRegion: site.address.region,
          postalCode: site.address.postalCode,
          addressCountry: site.address.country,
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: site.geo.lat,
          longitude: site.geo.lng,
        },
        areaServed: {
          '@type': 'State',
          name: 'Florida',
        },
        openingHoursSpecification: openingHours,
        hasCredential: {
          '@type': 'EducationalOccupationalCredential',
          credentialCategory: 'Florida Title Insurance Agency License',
          identifier: site.agencyLicense,
          recognizedBy: {
            '@type': 'GovernmentOrganization',
            name: 'Florida Department of Financial Services',
          },
        },
        employee: { '@id': AGENT_ID },
        sameAs: [site.googleProfileUrl, ...site.profiles],
      }}
    />
  );
}

export function PersonSchema({
  name,
  role,
  credential,
  slug,
  linkedin,
}: {
  name: string;
  role: string;
  credential: string | null;
  slug: string;
  linkedin?: string;
}) {
  const sameAs = linkedin ? [linkedin] : undefined;

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Person',
        '@id': `${SITE_URL}/team/${slug}#person`,
        name,
        jobTitle: role,
        worksFor: { '@id': ORGANIZATION_ID },
        url: absoluteUrl(`/team/${slug}`),
        ...(credential
          ? {
              hasCredential: {
                '@type': 'EducationalOccupationalCredential',
                credentialCategory: credential,
              },
            }
          : {}),
        ...(sameAs ? { sameAs } : {}),
      }}
    />
  );
}

export function ArticleSchema({
  headline,
  description,
  path,
  authorName,
  authorSlug,
  reviewedOn,
}: {
  headline: string;
  description: string;
  path: string;
  authorName: string;
  authorSlug: string;
  reviewedOn: string;
}) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline,
        description,
        mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(path) },
        datePublished: reviewedOn,
        dateModified: reviewedOn,
        author: {
          '@type': 'Person',
          '@id': `${SITE_URL}/team/${authorSlug}#person`,
          name: authorName,
        },
        // The named licensed agent reviews every page; that review is the
        // page's authority, so it is stated explicitly.
        reviewedBy: {
          '@type': 'Person',
          '@id': `${SITE_URL}/team/${authorSlug}#person`,
          name: authorName,
        },
        publisher: { '@id': ORGANIZATION_ID },
        isAccessibleForFree: true,
      }}
    />
  );
}

export function FaqSchema({ items }: { items: FaqItem[] }) {
  if (items.length === 0) return null;

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: items.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      }}
    />
  );
}

export function BreadcrumbSchema({ trail }: { trail: { name: string; path: string }[] }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: trail.map((crumb, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: crumb.name,
          item: absoluteUrl(crumb.path),
        })),
      }}
    />
  );
}
