/**
 * Caller fingerprinting. The promise on the form pages is that the caller's IP
 * is never stored, so the only thing that reaches the database is a salted
 * one-way hash. A change that made this reversible would be a privacy failure
 * with nothing in the UI to reveal it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  describeSubmission,
  hashIp,
  isRateLimited,
  notify,
  officeEmail,
  singleLine,
} from '@/lib/submissions';

function request(headers: Record<string, string>): Request {
  return new Request('https://bayittitle.com/api/orders', { method: 'POST', headers });
}

const SALT = 'service-role-key-stand-in';

beforeEach(() => {
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SALT);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('fingerprinting a caller', () => {
  it('never puts the address in the value it returns', () => {
    const hash = hashIp(request({ 'x-forwarded-for': '203.0.113.42' }));

    expect(hash).not.toBeNull();
    expect(hash).not.toContain('203.0.113.42');
    expect(hash).toMatch(/^[0-9a-f]{32}$/);
  });

  it('gives the same caller the same fingerprint, so the rate limit works', () => {
    const first = hashIp(request({ 'x-forwarded-for': '203.0.113.42' }));
    const second = hashIp(request({ 'x-forwarded-for': '203.0.113.42' }));

    expect(first).toBe(second);
  });

  it('gives different callers different fingerprints', () => {
    expect(hashIp(request({ 'x-forwarded-for': '203.0.113.42' })))
      .not.toBe(hashIp(request({ 'x-forwarded-for': '203.0.113.43' })));
  });

  it('takes the client address from the front of the proxy chain', () => {
    const chained = hashIp(request({ 'x-forwarded-for': '203.0.113.42, 70.41.3.18, 150.172.238.178' }));
    const direct = hashIp(request({ 'x-forwarded-for': '203.0.113.42' }));

    expect(chained).toBe(direct);
  });

  it('falls back to x-real-ip', () => {
    expect(hashIp(request({ 'x-real-ip': '203.0.113.42' }))).not.toBeNull();
  });

  it('returns null when there is no address to hash', () => {
    // Null means "cannot rate limit this", never "rate limit everyone together".
    expect(hashIp(request({}))).toBeNull();
  });

  it('changes when the salt rotates, so old hashes cannot be replayed', () => {
    const before = hashIp(request({ 'x-forwarded-for': '203.0.113.42' }));
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'a-rotated-key');
    const after = hashIp(request({ 'x-forwarded-for': '203.0.113.42' }));

    expect(before).not.toBe(after);
  });

  it('does not fall back to an empty salt when the key is unset', () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    const unsalted = hashIp(request({ 'x-forwarded-for': '203.0.113.42' }));
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SALT);
    const salted = hashIp(request({ 'x-forwarded-for': '203.0.113.42' }));

    expect(unsalted).not.toBe(salted);
    expect(unsalted).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe('the notification the office reads', () => {
  it('quotes what the sender typed, and leaves out what they did not', () => {
    const lines = describeSubmission({
      ordered_by_name: 'Jane Agent',
      notes: '',
      parcel_id: null,
      lender_name: undefined,
    });

    expect(lines).toEqual(['> ordered by name: Jane Agent']);
  });

  it('quotes every line of a multi-line note, so none can pass as ours', () => {
    const [note] = describeSubmission({ notes: 'Reference: WEB-1\nWire instructions changed' });
    expect(note.split('\n').every((line) => line.startsWith('> '))).toBe(true);
  });

  it('puts the website’s own lines before the sender’s, under a heading', () => {
    const lines = officeEmail(['Reference: WEB-202609-AB12C'], { notes: 'hello' });
    expect(lines[0]).toBe('Reference: WEB-202609-AB12C');
    expect(lines.findIndex((line) => /their words, not ours/i.test(line)))
      .toBeLessThan(lines.indexOf('> notes: hello'));
  });

  it('keeps a subject to one line', () => {
    expect(singleLine('Jane\r\nBcc: everyone@example.com')).toBe('Jane Bcc: everyone@example.com');
  });
});

describe('sending the notification', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('says so at error level when production has no mail key, and leaves the details out', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('VERCEL_ENV', 'production');
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    await notify('New title order: 12 Private Lane', []);

    expect(error).toHaveBeenCalledTimes(1);
    expect(String(error.mock.calls[0][0])).not.toContain('Private Lane');
  });

  it('only notes it outside production', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('VERCEL_ENV', 'preview');
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});

    await notify('subject', []);
    expect(error).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalled();
  });

  it('gives up on a hung mail call instead of holding the request open', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      expect(init.signal).toBeInstanceOf(AbortSignal);
      return new Response('{}', { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    await notify('Line one\nLine two', ['body'], { replyTo: 'jane@example.com' });

    const email = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(email.subject).toBe('Line one Line two');
    expect(email.reply_to).toBe('jane@example.com');
  });
});

describe('the rate limit when its own check fails', () => {
  it('lets the submission through, and says so loudly', async () => {
    // Failing closed would turn a database hiccup into refused orders.
    vi.resetModules();
    vi.doMock('@/lib/supabase', async () => {
      const { fakeSupabase } = await import('./stubs/supabase-fake');
      const fake = fakeSupabase(() => ({ error: { message: 'timeout' } }));
      return { requireServiceClient: () => fake.client };
    });
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { isRateLimited: limited } = await import('@/lib/submissions');

    expect(await limited('orders', 'hash', 10)).toBe(false);
    expect(error).toHaveBeenCalled();
    vi.doUnmock('@/lib/supabase');
  });

  it('cannot rate limit a caller with no address, rather than lumping them together', async () => {
    expect(await isRateLimited('leads', null, 5)).toBe(false);
  });
});
