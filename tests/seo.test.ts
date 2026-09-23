/**
 * Meta descriptions come from the direct answer, which is already written to
 * stand alone. Trimming it must not invent anything or cut mid-thought.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  TITLE_LIMIT,
  fittedTitle,
  metaDescription,
  formatLongDate,
  formatReviewDate,
  indexingAllowed,
  CANONICAL_HOST,
  OWN_HOSTS,
  siteVerification,
  teamPageHasContent,
} from '@/lib/seo';
import { site } from '@/lib/site';
import { OrganizationSchema, openingHoursSpecification } from '@/components/Schema';

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

  // Vercel reports the shortest production domain, which is the apex whenever
  // the apex is attached, whichever host is primary. The gate once demanded www
  // exactly, and the live site went out closed to every crawler because of it.
  it.each(['bayittitle.com', 'www.bayittitle.com'])('says yes when production reports %s', (host) => {
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', host);
    expect(indexingAllowed()).toBe(true);
  });

  it('says no for a host that merely contains the domain', () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'bayittitle.com.example.net');
    expect(indexingAllowed()).toBe(false);
  });

  it('lists both of the domain\'s hosts, the canonical one among them', () => {
    expect(OWN_HOSTS).toContain(canonicalHost);
    expect(OWN_HOSTS).toContain(CANONICAL_HOST);
    expect(new Set(OWN_HOSTS.map((host) => host.replace(/^www\./, ''))).size).toBe(1);
  });
});

/**
 * The canonical is the URL that answers 200. At the cutover Vercel was set to
 * serve the apex and redirect www to it, while every canonical, sitemap entry
 * and JSON-LD id still named www: a crawler following any of them landed on a
 * redirect. A NEXT_PUBLIC_SITE_URL copied from the old .env.example would
 * bring that back, so the code, not the variable, picks between our two hosts.
 */
describe('the base for canonical URLs', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function freshSiteUrl() {
    vi.resetModules();
    return (await import('@/lib/seo')).SITE_URL;
  }

  it('is the canonical host when nothing overrides it', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    expect(await freshSiteUrl()).toBe(site.url);
  });

  it('ignores a variable naming our other host', async () => {
    const other = OWN_HOSTS.find((host) => host !== CANONICAL_HOST)!;
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', `https://${other}`);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await freshSiteUrl()).toBe(site.url);
  });

  it('still honours a variable naming somewhere else entirely', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://staging.example.com');
    expect(await freshSiteUrl()).toBe('https://staging.example.com');
  });
});

describe('fitting a title', () => {
  it('keeps the site name when there is room for it', () => {
    expect(fittedTitle('Buyer closing costs in Florida')).toBe('Buyer closing costs in Florida');
  });

  it('drops the site name before any of the title', () => {
    // 55 characters: fits alone, not with " | Bayit Title".
    const title = 'Title company in Miami, FL: title insurance and closing';
    expect(fittedTitle(title)).toEqual({ absolute: title });
  });

  it('falls back to the shorter title only when the long one cannot fit at all', () => {
    const long = 'Title company in Palm Beach County, FL: West Palm Beach and Boca Raton closings';
    const short = 'Title company in Palm Beach County, FL';

    expect(fittedTitle(long, short)).toBe(short);
  });

  it('never returns more than the limit when a candidate fits', () => {
    const result = fittedTitle('x'.repeat(80), 'y'.repeat(TITLE_LIMIT));
    expect(result).toEqual({ absolute: 'y'.repeat(TITLE_LIMIT) });
  });
});

describe('thin team pages', () => {
  it('counts a bio the person wrote', () => {
    expect(teamPageHasContent({ slug: 'jennifer', bio: ['Her own words.'], publicRecord: [] }, [])).toBe(true);
  });

  it('counts a license on the public record, which every byline links to', () => {
    expect(
      teamPageHasContent({ slug: 'shevy', bio: null, publicRecord: ['Florida Title Agent License W766033'] }, []),
    ).toBe(true);
  });

  it('counts a review that names the person', () => {
    expect(
      teamPageHasContent({ slug: 'shevy', bio: null, publicRecord: [] }, [{ teamMemberSlug: 'shevy' }]),
    ).toBe(true);
  });

  it('treats a name and a role alone as thin, whoever else is reviewed', () => {
    expect(
      teamPageHasContent({ slug: 'gedaliah', bio: null, publicRecord: [] }, [
        { teamMemberSlug: 'shevy' },
        { teamMemberSlug: null },
      ]),
    ).toBe(false);
  });
});

/**
 * schema.org takes opening hours on the 24-hour clock only. The office hours
 * are written twice in lib/site.ts, once for readers and once for the markup,
 * so the two are held to saying the same thing.
 */
describe('opening hours in the markup', () => {
  function to24Hour(time: string): string {
    const [, h, m, meridiem] = /^(\d{1,2}):(\d{2}) (AM|PM)$/.exec(time)!;
    const hour = (Number(h) % 12) + (meridiem === 'PM' ? 12 : 0);
    return `${String(hour).padStart(2, '0')}:${m}`;
  }

  it('publishes times in the HH:MM form schema.org accepts', () => {
    for (const entry of openingHoursSpecification()) {
      expect(entry.opens).toMatch(/^\d{2}:\d{2}$/);
      expect(entry.closes).toMatch(/^\d{2}:\d{2}$/);
    }
  });

  it('gives the markup the same hours the page shows', () => {
    for (const entry of site.hours) {
      if (entry.open === null) {
        expect(entry.opens).toBeNull();
        continue;
      }
      expect(entry.opens).toBe(to24Hour(entry.open));
      expect(entry.closes).toBe(to24Hour(entry.close!));
    }
  });

  it('leaves the closed days out rather than publishing them with no times', () => {
    const days = openingHoursSpecification().flatMap((entry) => entry.dayOfWeek);
    expect(days).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  });
});

describe('the organization every page describes', () => {
  // Rendered on every page. It once said the agency facilitates 1031 exchanges
  // "through" the similarly named exchange company, which has no connection to
  // it — the one thing lib/site.ts says the site must never say.
  it('never routes a 1031 exchange through the similarly named company', () => {
    const element = OrganizationSchema() as { props: { data: { description: string } } };
    const { description } = element.props.data;

    expect(description).not.toMatch(new RegExp(site.exchangeCompany.name));
    expect(description).toMatch(/whichever qualified intermediary/);
  });

  it('is a local business Google can draw a knowledge panel from', () => {
    const { data } = (OrganizationSchema() as { props: { data: Record<string, unknown> } }).props;

    expect(data['@type']).toEqual(expect.arrayContaining(['InsuranceAgency']));
    // Google wants a logo of at least 112px each side; the route draws 512.
    expect(data.logo).toMatchObject({ url: expect.stringMatching(/\/logo\.png$/), width: 512, height: 512 });
    // The agent is named where she is referenced, not left as a bare id.
    expect(data.employee).toMatchObject({ '@type': 'Person', name: site.agentInCharge.displayName });
    expect((data.makesOffer as unknown[]).length).toBeGreaterThan(3);
  });
});
