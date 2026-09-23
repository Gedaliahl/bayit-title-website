import type { MetadataRoute } from 'next';

import { getAllDocs } from '@/lib/content';
import { countyHasLocalFacts, getCounties } from '@/lib/locations';
import { FLORIDA_CITIES } from '@/lib/florida-cities';
import { team } from '@/lib/team';
import { getReviews } from '@/lib/reviews';
import { absoluteUrl, teamPageHasContent } from '@/lib/seo';
import { PRIVACY_PUBLISHED } from '@/lib/privacy';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [allProblems, allServices, counties, reviews] = await Promise.all([
    getAllDocs('title-problems'),
    getAllDocs('services'),
    getCounties(),
    getReviews(),
  ]);

  // Drafts can be readable on a preview build, but never listed for crawlers.
  const problems = allProblems.filter((doc) => doc.status === 'reviewed');
  const services = allServices.filter((doc) => doc.status === 'reviewed');

  // Only the reviewed articles carry a date that means anything. The other
  // pages have no record of when their content last changed, and stamping
  // them with the build time told crawlers that every page changed on every
  // deploy — which teaches them to ignore the field. They go without one.
  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/title-problems'), changeFrequency: 'weekly', priority: 0.9 },
    { url: absoluteUrl('/services'), changeFrequency: 'monthly', priority: 0.8 },
    { url: absoluteUrl('/counties'), changeFrequency: 'monthly', priority: 0.8 },
    { url: absoluteUrl('/about'), changeFrequency: 'yearly', priority: 0.6 },
    { url: absoluteUrl('/team'), changeFrequency: 'yearly', priority: 0.6 },
    { url: absoluteUrl('/reviews'), changeFrequency: 'monthly', priority: 0.5 },
    { url: absoluteUrl('/contact'), changeFrequency: 'yearly', priority: 0.6 },
    { url: absoluteUrl('/order'), changeFrequency: 'yearly', priority: 0.7 },
    { url: absoluteUrl('/quote'), changeFrequency: 'yearly', priority: 0.7 },
    { url: absoluteUrl('/estimate'), changeFrequency: 'yearly', priority: 0.8 },
    { url: absoluteUrl('/closing-costs'), changeFrequency: 'yearly', priority: 0.7 },
    { url: absoluteUrl('/closing-costs/buyer'), changeFrequency: 'yearly', priority: 0.8 },
    { url: absoluteUrl('/closing-costs/seller'), changeFrequency: 'yearly', priority: 0.8 },
    { url: absoluteUrl('/closing-costs/title-insurance-calculator'), changeFrequency: 'yearly', priority: 0.9 },
    { url: absoluteUrl('/closing-costs/doc-stamp-calculator'), changeFrequency: 'yearly', priority: 0.8 },
    { url: absoluteUrl('/closing-costs/who-pays-title-insurance'), changeFrequency: 'monthly', priority: 0.8 },
    { url: absoluteUrl('/partners'), changeFrequency: 'monthly', priority: 0.7 },
    // Same rule as a draft content page: nothing unreviewed is listed for crawlers.
    ...(PRIVACY_PUBLISHED
      ? [
          {
            url: absoluteUrl('/privacy'),
           
            changeFrequency: 'yearly' as const,
            priority: 0.3,
          },
        ]
      : []),
  ];

  return [
    ...staticPages,
    ...problems.map((doc) => ({
      url: absoluteUrl(`/title-problems/${doc.slug}`),
      // The review date is the real last-modified: it is when a licensed person
      // last stood behind the page.
      lastModified: new Date(`${doc.reviewed_on!}T00:00:00Z`),
      changeFrequency: 'yearly' as const,
      priority: 0.8,
    })),
    ...services.map((doc) => ({
      url: absoluteUrl(`/services/${doc.slug}`),
      lastModified: new Date(`${doc.reviewed_on!}T00:00:00Z`),
      changeFrequency: 'yearly' as const,
      priority: 0.7,
    })),
    // A county page with nothing local on it asks not to be indexed, so it is
    // not asked for here either (countyHasLocalFacts).
    ...counties.filter(countyHasLocalFacts).map((county) => ({
      url: absoluteUrl(`/counties/${county.slug}`),
     
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    // A city page renders only when its county has a row, so the list is the
    // cities whose county is in the table — the same rule the route follows.
    ...FLORIDA_CITIES.filter((city) =>
      counties.some((county) => county.slug === city.countySlug && countyHasLocalFacts(county)),
    ).map(
      (city) => ({
        url: absoluteUrl(`/cities/${city.slug}`),
       
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      }),
    ),
    // A team page with no bio and no review naming its person is noindexed;
    // listing it here would ask crawlers for a page it then turns away.
    ...team.filter((member) => teamPageHasContent(member, reviews)).map((member) => ({
      url: absoluteUrl(`/team/${member.slug}`),
     
      changeFrequency: 'yearly' as const,
      priority: 0.4,
    })),
  ];
}
