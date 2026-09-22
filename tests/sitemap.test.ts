/**
 * What the sitemap tells crawlers. A last-modified date is only worth sending
 * when it is true: stamping every page with the build time says the whole site
 * changed on every deploy, and crawlers learn to ignore the field. And a page
 * the site marks noindex is not a page to ask them for.
 */
import { describe, expect, it } from 'vitest';

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
      expect(listed.has(absoluteUrl(`/team/${member.slug}`))).toBe((member.bio?.length ?? 0) > 0);
    }
  });
});

describe('robots.txt', () => {
  it('names no host, which only Yandex ever read', () => {
    expect(robots()).not.toHaveProperty('host');
  });
});
