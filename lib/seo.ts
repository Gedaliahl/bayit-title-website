import type { Metadata } from 'next';

import { site } from './site';

/**
 * The absolute base for canonical URLs, JSON-LD and the sitemap.
 *
 * Environment variables are strings, so an unset variable and one set to an
 * empty string mean the same thing here. `??` does not: it accepts `''` and
 * hands `new URL()` a value that throws at module scope, which fails the whole
 * build rather than one request. Hence the falsy check and the try/catch.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  // On a preview deployment the canonical domain is not serving this build, so
  // the deployment's own hostname is the correct base for absolute URLs.
  const previewUrl =
    process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL?.trim()
      ? `https://${process.env.VERCEL_URL.trim()}`
      : undefined;

  const candidate = explicit || previewUrl || site.url;

  try {
    // Parsing validates and normalises; a bare host or a typo throws here
    // rather than at first render.
    return new URL(candidate).toString().replace(/\/$/, '');
  } catch {
    console.warn(
      `[seo] NEXT_PUBLIC_SITE_URL is not a valid absolute URL (${JSON.stringify(candidate)}). ` +
        `Falling back to ${site.url}.`,
    );
    return site.url;
  }
}

export const SITE_URL = resolveSiteUrl();

/**
 * Whether this deployment is the one the public is meant to find.
 *
 * The domain has not cut over. Until it does, this codebase answers on a
 * *.vercel.app hostname while the old site still serves www.bayittitle.com, and
 * a second fully crawlable copy of every page is a duplicate of the site it is
 * meant to replace — competing with it for its own search terms and splitting
 * the signals between the two. So only the deployment actually answering for
 * the canonical host invites crawlers; every other one is closed to them.
 *
 * `VERCEL_PROJECT_PRODUCTION_URL` is the host Vercel serves this project's
 * production deployment on, and it becomes the real domain the moment that
 * domain is attached to the project. The cutover therefore turns indexing on by
 * itself. That is the whole point of deriving this rather than reading a flag:
 * a flag is a thing somebody has to remember on the day, and forgetting it
 * leaves the real site invisible.
 *
 * Off Vercel — a local build, a CI build — nothing is being served to the
 * public, so the answer is no.
 */
export function indexingAllowed(): boolean {
  if (process.env.VERCEL_ENV !== 'production') return false;

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (!productionHost) return false;

  try {
    return productionHost.toLowerCase() === new URL(site.url).host.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * A verification token as the dashboards hand it over.
 *
 * Google and Bing both present the token inside a ready-made `<meta>` tag, and
 * pasting the whole tag into an env var is the obvious mistake. Take the
 * content out rather than rendering a tag inside a tag.
 */
function readVerificationToken(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;

  const fromTag = /content=["']([^"']+)["']/.exec(value);
  return (fromTag ? fromTag[1] : value).trim() || undefined;
}

/**
 * Proves ownership of the domain to Search Console and Bing Webmaster Tools.
 *
 * Neither token is a secret — both are published in the page head. They live in
 * environment variables so that verifying a property is a dashboard change
 * rather than a deploy, and so the preview domain is never verified by
 * accident: a property is per-origin, and verifying the Vercel hostname would
 * report on a site nobody is meant to find.
 *
 * Returns undefined when neither is set, so an unverified deploy emits no tag
 * at all rather than an empty one.
 */
export function siteVerification(): Metadata['verification'] | undefined {
  const google = readVerificationToken(process.env.GOOGLE_SITE_VERIFICATION);
  const bing = readVerificationToken(process.env.BING_SITE_VERIFICATION);

  if (!google && !bing) return undefined;

  return {
    ...(google ? { google } : {}),
    // Bing has no dedicated field in Next's metadata; its tag is msvalidate.01.
    ...(bing ? { other: { 'msvalidate.01': bing } } : {}),
  };
}

export function absoluteUrl(pathname: string): string {
  return `${SITE_URL}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

/**
 * Meta descriptions come from the direct answer, trimmed at a sentence boundary.
 * The direct answer is already written to stand alone, so nothing new is invented.
 */
export function metaDescription(text: string, max = 155): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '));
  return lastStop > 60 ? cut.slice(0, lastStop + 1) : `${cut.replace(/\s+\S*$/, '')}…`;
}

/**
 * A `YYYY-MM-DD` date from content, as a `Date` fixed to UTC midnight.
 *
 * Every date the site prints from a file — a review date, the day a rule was
 * read — is a plain calendar day with no time and no zone. Parsing one in the
 * build server's zone would shift the rendered day, and for a date near the
 * first of a month it would shift the month with it, so the day is pinned to
 * UTC here and every formatter below reads it back in UTC.
 *
 * It throws rather than returning an Invalid Date, because the alternative is
 * the failure this replaced: `Invalid time value` raised from whichever
 * consumer happened to run first, naming neither the field nor the file.
 */
export function parseContentDate(iso: string): Date {
  const parsed = new Date(`${iso}T00:00:00Z`);
  // The round trip is the check that matters. JS rolls an impossible day
  // forward rather than rejecting it — 2026-09-31 parses happily as 1 October
  // — so a typo in a hand-written constant would print a day that never was.
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== iso) {
    throw new Error(`Expected a date as YYYY-MM-DD, got ${JSON.stringify(iso)}.`);
  }
  return parsed;
}

export function formatReviewDate(iso: string | null): string | null {
  if (!iso) return null;
  return parseContentDate(iso).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatLongDate(iso: string): string {
  return parseContentDate(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
