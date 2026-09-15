/**
 * Caller fingerprinting. The promise on the form pages is that the caller's IP
 * is never stored, so the only thing that reaches the database is a salted
 * one-way hash. A change that made this reversible would be a privacy failure
 * with nothing in the UI to reveal it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { hashIp, describeSubmission } from '@/lib/submissions';

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
  it('leaves the honeypot out of the email', () => {
    const lines = describeSubmission({
      ordered_by_name: 'Jane Agent',
      company: 'Acme Bots',
      notes: '',
      parcel_id: undefined,
    });

    expect(lines).toEqual(['ordered by name: Jane Agent']);
  });
});
