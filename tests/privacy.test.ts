/**
 * The privacy policy's publication gate.
 *
 * A privacy policy is a binding representation by a licensed financial
 * institution, so an unreviewed one must not be served, linked or listed for
 * crawlers. Three places have to agree about that — the page, the footer link
 * and the sitemap — and nothing about the site looks broken if one of them
 * drifts, which is why it is asserted here.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function load() {
  vi.resetModules();
  return import('@/lib/privacy');
}

beforeEach(() => {
  vi.stubEnv('SHOW_DRAFTS', '');
  vi.stubEnv('VERCEL_ENV', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('an unreviewed policy', () => {
  it('is not published on the public site', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { PRIVACY_STATUS, PRIVACY_PUBLISHED } = await load();

    // If this fails because the status is now 'reviewed', that is the intended
    // way out — but only after counsel has been through the page and every
    // VERIFY on it is resolved.
    expect(PRIVACY_STATUS).toBe('draft');
    expect(PRIVACY_PUBLISHED).toBe(false);
  });

  it('stays out of the sitemap while it is a draft', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.resetModules();
    const sitemap = (await import('@/app/sitemap')).default;

    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls.some((url) => url.endsWith('/privacy'))).toBe(false);
    // The rest of the sitemap is unaffected.
    expect(urls.some((url) => url.endsWith('/order'))).toBe(true);
  });

  it('is readable on a preview build, so it can be reviewed', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SHOW_DRAFTS', '1');
    const { PRIVACY_PUBLISHED } = await load();

    expect(PRIVACY_PUBLISHED).toBe(true);
  });
});
