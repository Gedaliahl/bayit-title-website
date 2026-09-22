/**
 * The privacy policy.
 *
 * Two policies ran on the Wix site and said overlapping things in different
 * words. These assert that the commitments in both survived the merge, because
 * a privacy policy is a set of promises rather than copy: dropping the line
 * about not selling personal information, or the SMS opt-out, is invisible on
 * the page and consequential everywhere else.
 *
 * The SMS terms in particular are what carriers require to be publicly posted
 * for an A2P messaging registration, and the old page was cited as both the
 * privacy policy and the SMS terms of service. Losing them can stop messages
 * being delivered.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { PRIVACY_EFFECTIVE_DATE, PRIVACY_PUBLISHED } from '@/lib/privacy';

const page = readFileSync(join(process.cwd(), 'app/privacy/page.tsx'), 'utf8');

describe('the policy is reachable', () => {
  it('is published, so the footer link and the sitemap entry are real', async () => {
    expect(PRIVACY_PUBLISHED).toBe(true);
  });

  it('is listed in the sitemap', async () => {
    const sitemap = (await import('@/app/sitemap')).default;
    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls.some((url) => url.endsWith('/privacy'))).toBe(true);
  });

  it('carries an effective date, as the policy itself promises', () => {
    expect(PRIVACY_EFFECTIVE_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(page).toContain('PRIVACY_EFFECTIVE_DATE');
  });
});

describe('commitments carried over from the Wix policies', () => {
  it('still says we do not sell personal information', () => {
    expect(page).toContain('We do not sell your personal information');
  });

  it('still carries the SMS terms a carrier registration depends on', () => {
    // Each of these is required content for an A2P campaign, not prose.
    expect(page).toMatch(/reply\s+STOP/i);
    expect(page).toMatch(/reply\s+HELP/i);
    expect(page).toMatch(/Message frequency varies/i);
    expect(page).toMatch(/Message and data rates may apply/i);
  });

  it('still promises SMS consent is never shared or sold', () => {
    expect(page).toMatch(/consent to receive text messages is never shared/i);
    expect(page).toMatch(/will not be sold, rented, or shared for marketing/i);
  });

  it('still names who information is shared with', () => {
    for (const party of ['underwriters', 'lenders', 'attorneys', 'recording offices']) {
      expect(page.toLowerCase()).toContain(party);
    }
  });

  it('still states the safeguards and the rights to access, correct and delete', () => {
    expect(page).toMatch(/administrative, technical and physical safeguards/i);
    expect(page).toMatch(/corrected/i);
    expect(page).toMatch(/deleted/i);
  });

  it('still tells people how to reach us about it', () => {
    expect(page).toContain('site.email');
    expect(page).toContain('site.phoneDisplay');
    expect(page).toContain('site.address.street');
  });
});

describe('claims about the website that the code has to keep true', () => {
  it('claims no cookies, which the site must therefore not set', () => {
    // Verified in a browser across five pages with analytics active: no
    // cookies, no localStorage, no sessionStorage. If that ever changes, this
    // page becomes a false statement and not merely stale copy.
    expect(page).toContain('sets no cookies');
  });

  it('says only a fingerprint of the IP is kept, which lib/submissions.ts must honour', () => {
    // The old line, "we do not store your IP address", was untrue as written:
    // the host's request logs hold it. What this site stores is the hash.
    expect(page).not.toMatch(/do not store your IP address/i);
    expect(page).toMatch(/fingerprint of your IP address, not the address itself/i);
    expect(page).toMatch(/hosting provider[\s\S]{0,80}request logs/i);

    const submissions = readFileSync(join(process.cwd(), 'lib/submissions.ts'), 'utf8');
    expect(submissions).toContain('createHash');
    expect(submissions).not.toMatch(/ip:\s*ip\b/);
  });

  it('states the two retention limits the purge enforces, from the same constants', () => {
    // The numbers are rendered from lib/documents.ts, so the page cannot drift
    // from what app/api/cron/purge actually deletes.
    expect(page).toContain('{QUOTE_RETENTION_DAYS}');
    expect(page).toContain('{RETENTION_DAYS}');
    expect(page).toMatch(/contract sent for pricing/i);
  });

  it('scopes the three required fields to the order form', () => {
    expect(page).toMatch(/On the order form, only your name, your email address and the property/);
  });

  it('keeps the no-third-party-scripts claim true when the bot check is on', () => {
    expect(page).toMatch(/botCheck \?/);
    expect(page).toContain('This site loads no');
    expect(page).toMatch(/one outside\s+script this site loads is Cloudflare/);
  });
});

describe('where the policy has to be linked', () => {
  // The Wix policy promised a link "near all consent language on web forms and
  // in the footer of every website page", and this page repeats that promise.
  it.each(['components/OrderForm.tsx', 'components/LeadForm.tsx', 'components/SiteFooter.tsx'])(
    '%s links to it',
    (file) => {
      expect(readFileSync(join(process.cwd(), file), 'utf8')).toContain('href="/privacy"');
    },
  );
});
