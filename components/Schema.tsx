// JSON-LD. The point of this file is entity resolution: search engines and AI
// assistants need to confirm that bayittitle.com, the DFS license record, the
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

const WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

/**
 * "Monday – Friday" is a range to a reader and a list of two days to a parser.
 * Splitting on the dash and stopping there published hours for Monday and
 * Friday and silently closed the office for the three days in between, so the
 * range is expanded here instead.
 */
function daysInRange(label: string): string[] {
  const [from, to] = label.split('–').map((day) => day.trim());
  if (!to) return [from];

  const start = WEEK.indexOf(from as (typeof WEEK)[number]);
  const end = WEEK.indexOf(to as (typeof WEEK)[number]);
  // An unrecognised day name is a typo in lib/site.ts, not a reason to emit
  // nothing: fall back to the two named days rather than dropping the entry.
  if (start === -1 || end === -1 || end < start) return [from, to];

  return WEEK.slice(start, end + 1) as unknown as string[];
}

export function openingHoursSpecification() {
  return site.hours
    .filter((entry) => entry.opens !== null)
    .map((entry) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: daysInRange(entry.days),
      opens: entry.opens,
      closes: entry.closes,
    }));
}

export function OrganizationSchema() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        // ProfessionalService is already a LocalBusiness subtype; naming both
        // says the same thing twice.
        '@type': 'ProfessionalService',
        '@id': ORGANIZATION_ID,
        name: site.name,
        legalName: site.legalName,
        url: SITE_URL,
        // The 1031 clause says what the agency does — the closing side, with the
        // client's own intermediary — and never "through" the similarly named
        // exchange company, which has no connection to the agency (lib/site.ts).
        description:
          `${site.legalName} is a Florida title insurance agency in ${site.address.city}, ` +
          `closing residential and commercial transactions throughout Florida, including the ` +
          `closing side of 1031 like-kind exchanges with whichever qualified intermediary the ` +
          `client chooses.`,
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
        openingHoursSpecification: openingHoursSpecification(),
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
  image,
}: {
  headline: string;
  description: string;
  path: string;
  authorName: string;
  authorSlug: string;
  reviewedOn: string;
  /** The page's own social card, which is also the image Google shows for the article. */
  image?: string;
}) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline,
        description,
        mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(path) },
        ...(image ? { image } : {}),
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
