/**
 * What the sitemap tells crawlers. A last-modified date is only worth sending
 * when it is true: stamping every page with the build time says the whole site
 * changed on every deploy, and crawlers learn to ignore the field. And a page
 * the site marks noindex is not a page to ask them for.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import sitemap from '@/app/sitemap';
import robots from '@/app/robots';
import { team } from '@/lib/team';
import { absoluteUrl } from '@/lib/seo';

const entries = await sitemap();

describe('the sitemap', () => {
  it('dates only the pages that carry a review date', () => {
    for (const entry of entries) {
      const isReviewedArticle = /\/(title-problems|services)\/[^/]+$/.test(entry.url);
      if (isReviewedArticle) expect(entry.lastModified).toBeInstanceOf(Date);
      else expect(entry.lastModified).toBeUndefined();
    }
  });

  it('leaves out team pages that have nothing but a name and a role', () => {
    const listed = new Set(entries.map((entry) => entry.url));
    for (const member of team) {
      const hasContent = (member.bio?.length ?? 0) > 0 || member.publicRecord.length > 0;
      expect(listed.has(absoluteUrl(`/team/${member.slug}`))).toBe(hasContent);
    }
  });
});

describe('the county pages in the sitemap', () => {
  it('are only the ones that ask to be indexed', async () => {
    const { getCounties, countyHasLocalFacts } = await import('@/lib/locations');
    const listed = new Set(entries.map((entry) => entry.url));
    for (const county of await getCounties()) {
      expect(listed.has(absoluteUrl(`/counties/${county.slug}`)), county.name).toBe(countyHasLocalFacts(county));
    }
  });
});

describe('robots.txt', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('names no host, which only Yandex ever read', () => {
    expect(robots()).not.toHaveProperty('host');
  });

  // The live site's exact environment on the day it went out closed: the apex
  // attached, and Vercel reporting it as the production domain.
  it('opens every page to every crawler on the real domain', () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'bayittitle.com');
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];

    for (const rule of rules) {
      expect(rule.allow).toBe('/');
      // The form endpoints are the only thing held back, and they are not pages.
      expect(rule.disallow).toEqual(['/api/']);
    }
    expect(rules.some((rule) => rule.userAgent === '*')).toBe(true);
    expect(result.sitemap).toBe(absoluteUrl('/sitemap.xml'));
  });

  it('stays closed on a preview', () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'bayittitle.com');
    expect(robots()).toEqual({ rules: [{ userAgent: '*', disallow: '/' }] });
  });
});
