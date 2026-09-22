/**
 * The two endpoints nobody visits: the health check an uptime monitor calls,
 * and the daily purge Vercel Cron calls. One must never say more than yes or
 * no to a stranger; the other must never run for one.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase } from './stubs/supabase-fake';

const state = vi.hoisted(() => ({ client: null as unknown }));

vi.mock('@/lib/supabase', () => ({
  requireServiceClient: () => state.client,
  getServiceClient: () => state.client,
}));

beforeEach(() => {
  vi.resetModules();
  state.client = fakeSupabase().client;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('the health check', () => {
  it('fails while the office cannot be emailed', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    const { GET } = await import('@/app/api/health/route');

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.checks.resend).toEqual({ configured: false, reachable: false });
    expect(body.checks.supabase).toEqual({ configured: true, reachable: true });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('passes with everything answering, and gives away no key', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_secret_value');
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ name: 'restricted_api_key' }, { status: 401 })));
    const { GET } = await import('@/app/api/health/route');

    const response = await GET();
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).not.toContain('re_secret_value');
    expect(text).not.toContain('supabase.co');
  });

  it('asks Resend at most once a minute, however often it is called', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_key');
    const resend = vi.fn(async () => Response.json({ name: 'restricted_api_key' }, { status: 401 }));
    vi.stubGlobal('fetch', resend);
    const { GET } = await import('@/app/api/health/route');

    await GET();
    await GET();
    await GET();

    expect(resend).toHaveBeenCalledTimes(1);
  });

  it('fails when Supabase is not configured at all', async () => {
    state.client = null;
    vi.stubEnv('RESEND_API_KEY', 're_key');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
    const { GET } = await import('@/app/api/health/route');

    const body = await (await GET()).json();
    expect(body.ok).toBe(false);
    expect(body.checks.bucket.configured).toBe(false);
  });
});

describe('the daily purge', () => {
  const call = (authorization?: string) =>
    new Request('https://www.bayittitle.com/api/cron/purge', {
      headers: authorization ? { authorization } : {},
    });

  it('refuses to run without CRON_SECRET configured, whatever it is sent', async () => {
    vi.stubEnv('CRON_SECRET', '');
    const { GET } = await import('@/app/api/cron/purge/route');

    expect((await GET(call('Bearer '))).status).toBe(401);
    expect((await GET(call())).status).toBe(401);
  });

  it('refuses the wrong secret and runs for the right one', async () => {
    vi.stubEnv('CRON_SECRET', 'the-secret');
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const { GET } = await import('@/app/api/cron/purge/route');

    expect((await GET(call('Bearer wrong'))).status).toBe(401);

    const response = await GET(call('Bearer the-secret'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, quotePages: 0, orderDocuments: 0, abandonedUploads: 0 });
  });
});
