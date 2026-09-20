/**
 * Meta descriptions come from the direct answer, which is already written to
 * stand alone. Trimming it must not invent anything or cut mid-thought.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  metaDescription,
  formatLongDate,
  formatReviewDate,
  parseContentDate,
  indexingAllowed,
  siteVerification,
} from '@/lib/seo';
import { site } from '@/lib/site';

describe('meta descriptions', () => {
  it('leaves a short answer alone', () => {
    expect(metaDescription('An open permit is a permit the municipality never closed.'))
      .toBe('An open permit is a permit the municipality never closed.');
  });

  it('cuts at the end of a sentence rather than mid-thought', () => {
    const text =
      'A municipal lien search is not a title search, and a Florida closing needs both. ' +
      'It finds unrecorded municipal claims that a title search will not show, and it is ' +
      'ordered separately from the search itself.';

    const trimmed = metaDescription(text);

    expect(text.length).toBeGreaterThan(155);
    expect(trimmed).toBe(
      'A municipal lien search is not a title search, and a Florida closing needs both.',
    );
    expect(trimmed.length).toBeLessThanOrEqual(155);
  });

  it('falls back to a word boundary when no sentence ends in range', () => {
    const trimmed = metaDescription(`${'word '.repeat(60)}end`);

    expect(trimmed.endsWith('…')).toBe(true);
    expect(trimmed).not.toMatch(/\s…$/);
  });

  it('flattens the whitespace a markdown paragraph carries', () => {
    expect(metaDescription('Two lines\n  joined   loosely.')).toBe('Two lines joined loosely.');
  });
});

describe('dates', () => {
  it('renders a front-matter date on the day it says, whatever the build server is set to', () => {
    // Parsed as UTC on purpose: a naive parse shifts this to September 9th
    // west of Greenwich, and the byline date would disagree with the front matter.
    expect(formatLongDate('2026-09-10')).toBe('September 10, 2026');
  });

  it('prints nothing for a review with no trustworthy date', () => {
    expect(formatReviewDate(null)).toBeNull();
  });

  it('gives a review a month and year, never a day', () => {
    expect(formatReviewDate('2026-03-01')).toBe('March 2026');
  });
});

describe('proving we own the domain', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('emits no tag at all when nothing is verified', () => {
    // An empty content attribute is worse than no tag: it looks configured.
    expect(siteVerification()).toBeUndefined();
  });

  it('carries a Google token', () => {
    vi.stubEnv('GOOGLE_SITE_VERIFICATION', 'abc123');
    expect(siteVerification()).toEqual({ google: 'abc123' });
  });

  it('puts a Bing token under its own meta name', () => {
    vi.stubEnv('BING_SITE_VERIFICATION', 'bing456');
    expect(siteVerification()).toEqual({ other: { 'msvalidate.01': 'bing456' } });
  });

  it('carries both when both are set', () => {
    vi.stubEnv('GOOGLE_SITE_VERIFICATION', 'abc123');
    vi.stubEnv('BING_SITE_VERIFICATION', 'bing456');
    expect(siteVerification()).toEqual({
      google: 'abc123',
      other: { 'msvalidate.01': 'bing456' },
    });
  });

  it('takes the token out of a whole meta tag pasted by mistake', () => {
    // Both dashboards hand the token over inside a ready-made tag, so this is
    // the obvious thing to paste into an env var.
    vi.stubEnv(
      'GOOGLE_SITE_VERIFICATION',
      '<meta name="google-site-verification" content="abc123" />',
    );
    expect(siteVerification()).toEqual({ google: 'abc123' });
  });

  it('handles single quotes in a pasted tag', () => {
    vi.stubEnv('BING_SITE_VERIFICATION', "<meta name='msvalidate.01' content='bing456' />");
    expect(siteVerification()).toEqual({ other: { 'msvalidate.01': 'bing456' } });
  });

  it('treats a variable set to whitespace as unset', () => {
    vi.stubEnv('GOOGLE_SITE_VERIFICATION', '   ');
    expect(siteVerification()).toBeUndefined();
  });
});

/**
 * Which deployment crawlers are invited into is a decision about the firm's
 * search presence, not implementation detail. Until the domain cuts over, the
 * old site is the one ranking for these terms, and a crawlable copy of every
 * page on a vercel.app host competes with it. Getting this wrong in either
 * direction is expensive and silent, so both directions are pinned here.
 */
describe('which deployment crawlers are invited into', () => {
  const canonicalHost = new URL(site.url).host;

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('says no off Vercel, where nothing is served to the public', () => {
    expect(indexingAllowed()).toBe(false);
  });

  it('says no on a preview, whatever the production domain is', () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', canonicalHost);
    expect(indexingAllowed()).toBe(false);
  });

  it('says no while production still answers on a vercel.app host', () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'bayit-title-website.vercel.app');
    expect(indexingAllowed()).toBe(false);
  });

  it('says yes once the real domain is the production domain', () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', canonicalHost);
    expect(indexingAllowed()).toBe(true);
  });

  it('ignores the case Vercel happens to report the host in', () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', canonicalHost.toUpperCase());
    expect(indexingAllowed()).toBe(true);
  });
});

/**
 * A date in content is a calendar day, not an instant. Two things used to go
 * wrong with that: the day was parsed in the build server's zone, so a review
 * dated the 1st printed as the previous month anywhere west of UTC; and an
 * impossible day was rolled forward instead of rejected, because JS reads
 * 2026-09-31 as 1 October without complaint.
 */
describe('content dates', () => {
  it('holds a calendar day to UTC, whatever zone the build runs in', () => {
    const tz = process.env.TZ;
    // Honolulu is UTC-10, so a UTC-midnight date lands on the previous day —
    // and, on the first of a month, in the previous month.
    process.env.TZ = 'Pacific/Honolulu';
    try {
      expect(formatReviewDate('2026-09-01')).toBe('September 2026');
      expect(formatLongDate('2026-09-01')).toBe('September 1, 2026');
    } finally {
      process.env.TZ = tz;
    }
  });

  it('parses a plain day to UTC midnight', () => {
    expect(parseContentDate('2026-09-20').toISOString()).toBe('2026-09-20T00:00:00.000Z');
  });

  it('refuses a day that does not exist rather than rolling it forward', () => {
    expect(() => parseContentDate('2026-09-31')).toThrow(/YYYY-MM-DD/);
    expect(() => parseContentDate('2026-02-30')).toThrow(/YYYY-MM-DD/);
  });

  it('refuses a date that is not a plain day at all', () => {
    expect(() => parseContentDate('September 20, 2026')).toThrow(/YYYY-MM-DD/);
  });

  it('still lets a missing review date through as nothing to print', () => {
    expect(formatReviewDate(null)).toBeNull();
  });
});
