import type { MetadataRoute } from 'next';

import { getAllDocs } from '@/lib/content';
import { getCounties } from '@/lib/locations';
import { team } from '@/lib/team';
import { absoluteUrl } from '@/lib/seo';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [allProblems, allServices, counties] = await Promise.all([
    getAllDocs('title-problems'),
    getAllDocs('services'),
    getCounties(),
  ]);

  // Drafts can be readable on a preview build, but never listed for crawlers.
  const problems = allProblems.filter((doc) => doc.status === 'reviewed');
  const services = allServices.filter((doc) => doc.status === 'reviewed');

  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/title-problems'), lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: absoluteUrl('/services'), lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: absoluteUrl('/counties'), lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: absoluteUrl('/about'), lastModified: now, changeFrequency: 'yearly', priority: 0.6 },
    { url: absoluteUrl('/team'), lastModified: now, changeFrequency: 'yearly', priority: 0.6 },
    { url: absoluteUrl('/reviews'), lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: absoluteUrl('/contact'), lastModified: now, changeFrequency: 'yearly', priority: 0.6 },
    { url: absoluteUrl('/order'), lastModified: now, changeFrequency: 'yearly', priority: 0.7 },
    { url: absoluteUrl('/quote'), lastModified: now, changeFrequency: 'yearly', priority: 0.7 },
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
    ...counties.map((county) => ({
      url: absoluteUrl(`/counties/${county.slug}`),
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...team.map((member) => ({
      url: absoluteUrl(`/team/${member.slug}`),
      lastModified: now,
      changeFrequency: 'yearly' as const,
      priority: 0.4,
    })),
  ];
}
