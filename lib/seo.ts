import { site } from './site';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? site.url).replace(/\/$/, '');

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
