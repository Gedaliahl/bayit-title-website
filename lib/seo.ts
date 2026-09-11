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

export function formatReviewDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function formatLongDate(iso: string): string {
  // Front-matter dates are plain YYYY-MM-DD; parse as UTC so the rendered day
  // does not shift with the build server's timezone.
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
