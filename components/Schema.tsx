// JSON-LD. The point of this file is entity resolution: search engines and AI
// assistants need to confirm that bayittitle.com, the DFS license record, the
// Google Business Profile and the LinkedIn company page are one entity.
//
// Deliberately absent: AggregateRating. The reviews were collected by Google,
// not on-site. Marking them up as our own rating risks a manual action.

import { site } from '@/lib/site';
import { absoluteUrl, SITE_URL } from '@/lib/seo';
import type { FaqItem } from '@/lib/faq';
import { getTeamMember } from '@/lib/team';

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
const AGENT_SLUG = site.agentInCharge.displayName.split(' ')[0].toLowerCase();
const AGENT_ID = `${SITE_URL}/team/${AGENT_SLUG}#person`;
const agentInCharge = getTeamMember(AGENT_SLUG);

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

/** The services the firm offers, as the services page names them. */
export const SERVICES = [
  'Title search and examination',
  'Owner’s and lender’s title insurance',
  'Escrow and settlement',
  'Residential closings',
  'Commercial title and closings',
  'Mobile and remote online signings',
  'The closing side of 1031 like-kind exchanges',
] as const;

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
        // Both are LocalBusiness subtypes, so LocalBusiness itself is not named
        // again. InsuranceAgency is what the DFS license says the firm is — a
        // title insurance agency — and ProfessionalService is the closing work.
        '@type': ['InsuranceAgency', 'ProfessionalService'],
        '@id': ORGANIZATION_ID,
        name: site.name,
        legalName: site.legalName,
        url: SITE_URL,
        logo: {
          '@type': 'ImageObject',
          url: absoluteUrl('/logo.png'),
          width: 512,
          height: 512,
        },
        image: absoluteUrl('/opengraph-image'),
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
        hasMap: site.googleProfileUrl,
        openingHoursSpecification: openingHoursSpecification(),
        knowsAbout: [
          'Title insurance',
          'Title search and examination',
          'Real estate closings',
          'Escrow and settlement',
          'Commercial title insurance',
          'Remote online notarization',
          'Florida documentary stamp tax',
        ],
        // What the firm does, each in the words the services page uses for it.
        // No prices: the premium is the rule's, and the rest is quoted per file.
        makesOffer: SERVICES.map((name) => ({
          '@type': 'Offer',
          itemOffered: { '@type': 'Service', name, areaServed: { '@type': 'State', name: 'Florida' } },
        })),
        hasCredential: {
          '@type': 'EducationalOccupationalCredential',
          credentialCategory: 'Florida Title Insurance Agency License',
          identifier: site.agencyLicense,
          recognizedBy: {
            '@type': 'GovernmentOrganization',
            name: 'Florida Department of Financial Services',
          },
        },
        // Named in full here, because the Person node is only printed on the
        // team pages and a bare @id means nothing on the other pages.
        employee: {
          '@type': 'Person',
          '@id': AGENT_ID,
          name: site.agentInCharge.displayName,
          ...(agentInCharge ? { jobTitle: agentInCharge.role } : {}),
        },
        founder: { '@id': AGENT_ID },
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

/**
 * The site itself, on the homepage. It is what Google reads for the site name
 * it prints above a result, which would otherwise be guessed from the domain.
 */
export function WebSiteSchema() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: site.name,
        alternateName: site.legalName,
        inLanguage: 'en-US',
        publisher: { '@id': ORGANIZATION_ID },
      }}
    />
  );
}

/**
 * The firm's work, offered in one place: a county, a city, or the state. The
 * provider is always the one office in lib/site.ts. A county or city page is
 * an area the firm serves from Coral Springs, never an office of its own, so
 * the place goes in `areaServed` and nowhere else.
 */
export function ServiceSchema({
  name,
  description,
  path,
  areaServed,
}: {
  name: string;
  description: string;
  path: string;
  areaServed: Record<string, unknown>;
}) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Service',
        name,
        serviceType: 'Title insurance and real estate closings',
        description,
        url: absoluteUrl(path),
        provider: { '@id': ORGANIZATION_ID },
        areaServed,
      }}
    />
  );
}
