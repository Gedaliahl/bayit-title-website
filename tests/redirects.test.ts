/**
 * The legacy Wix redirect map.
 *
 * These are not style preferences. At cutover a 301 hands the old page's
 * accumulated ranking signal to the new one and a 404 throws it away, and on a
 * site whose whole strategy is search ranking and AI citation that is the
 * difference between launching with the domain's history and launching without
 * it. A dropped entry is invisible until the traffic is already gone.
 *
 * Sources were verified against the live Wix site, not guessed: the list these
 * replaced was a first pass at naming conventions, and seven of its nine
 * entries pointed at paths that had never existed.
 */
import { describe, expect, it } from 'vitest';

import { site } from '@/lib/site';

interface Redirect {
  source: string;
  destination: string;
  permanent: boolean;
}

async function redirects(): Promise<Redirect[]> {
  const config = (await import('../next.config.mjs')).default;
  return (await config.redirects()) as Redirect[];
}

function find(all: Redirect[], source: string): Redirect | undefined {
  return all.find((entry) => entry.source === source);
}

/**
 * Paths this site actually serves, so no redirect can point into thin air.
 * Add a route here when one is added to app/ and a redirect could target it.
 */
const ROUTES = new Set([
  '/', '/about', '/team', '/services', '/counties', '/title-problems',
  '/reviews', '/contact', '/order', '/quote', '/estimate',
  '/partners', '/privacy', '/icon.svg',
]);

describe('pages live on Wix today', () => {
  // Each was confirmed 200 on www.bayittitle.com. Every one of them needs
  // somewhere to land, or it 404s the day the domain moves.
  const expected: [string, string][] = [
    ['/home', '/'],
    ['/contact-us', '/contact'],
    ['/order-title', '/order'],
    ['/process', '/services'],
    ['/titleinsurance', '/services'],
    // The estimate page's second option publishes the promulgated schedule
    // and works a specific price out, which is what /rates was asked for.
    ['/rates', '/estimate?mode=numbers'],
  ];

  it.each(expected)('sends %s to %s, permanently', async (source, destination) => {
    const entry = find(await redirects(), source);

    expect(entry, `${source} has no redirect and would 404 at cutover`).toBeDefined();
    expect(entry!.destination).toBe(destination);
    // A 302 tells Google to keep the old URL. Only a 301 moves the signal.
    expect(entry!.permanent).toBe(true);
  });

  it('folds Wix\u2019s duplicate privacy path into the one page', async () => {
    // Wix published the policy at /privacy and /privacy-policy both. Only the
    // first is a page here.
    const entry = find(await redirects(), '/privacy-policy');

    expect(entry).toBeDefined();
    expect(entry!.destination).toBe('/privacy');
    expect(find(await redirects(), '/privacy')).toBeUndefined();
  });

  it('leaves /about alone, because the path did not change', async () => {
    expect(find(await redirects(), '/about')).toBeUndefined();
  });
});

describe('the calculator', () => {
  // The premium calculator had its own page until the estimate page took in
  // all three ways of pricing a closing. Its address is linked from other
  // people's pages and indexed, so it lands on the same tool rather than a 404.
  it('lands on the estimate page with the numbers open', async () => {
    const entry = find(await redirects(), '/calculator');

    expect(entry).toBeDefined();
    expect(entry!.destination).toBe('/estimate?mode=numbers');
    expect(entry!.permanent).toBe(true);
  });

  it('no longer has a page of its own to redirect to', () => {
    expect(ROUTES.has('/calculator')).toBe(false);
  });
});

describe('Pennsylvania', () => {
  // The firm holds a Florida license only. These 404 on Wix already, but the
  // handoff records that the old site carried them, so they may still be
  // indexed — and a stale PA page must neither resurface nor land on a 404.
  it.each(['/pennsylvania', '/pa-closings', '/pennsylvania-title-insurance'])(
    'keeps %s pointed at the Florida site',
    async (source) => {
      const entry = find(await redirects(), source);

      expect(entry).toBeDefined();
      expect(entry!.destination).toBe('/');
    },
  );
});

describe('the map as a whole', () => {
  it('never points anywhere this site does not serve', async () => {
    for (const entry of await redirects()) {
      // A destination may open a page at a particular mode; the page is what
      // has to exist.
      const pathname = entry.destination.split('?')[0];
      expect(ROUTES.has(pathname), `${entry.source} -> ${entry.destination}`).toBe(true);
    }
  });

  it('redirects each source only once', async () => {
    const sources = (await redirects()).map((entry) => entry.source);
    expect(sources).toEqual([...new Set(sources)]);
  });

  it('never redirects a path to itself', async () => {
    for (const entry of await redirects()) {
      expect(entry.destination).not.toBe(entry.source);
    }
  });

  it('carries no redirect for a path Wix never had', async () => {
    // All four were guesses at Wix conventions and all four 404 on the live
    // site. Re-adding one costs a rule that can never match.
    for (const phantom of ['/about-us', '/our-team', '/services-1', '/testimonials']) {
      expect(find(await redirects(), phantom)).toBeUndefined();
    }
  });
});

describe('the canonical host', () => {
  it('stays on www, where the existing index already points', async () => {
    // The Wix site 301s the apex to www, so every indexed URL and inbound link
    // is a www URL. Moving to the apex would put a redirect hop in front of the
    // entire existing index for no gain.
    expect(site.url).toBe('https://www.bayittitle.com');
  });
});
