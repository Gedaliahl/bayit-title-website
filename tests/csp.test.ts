/**
 * The Content-Security-Policy in next.config.mjs.
 *
 * A CSP is easy to weaken by accident and impossible to notice afterwards: the
 * site keeps working either way, which is exactly why nobody spots the day
 * 'unsafe-eval' or a wildcard arrives. These assert the properties that carry
 * the value, not the whole string.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const SUPABASE_URL = 'https://ajauxndpqllrsfivvurj.supabase.co';

interface Header {
  key: string;
  value: string;
}

async function headers(): Promise<Header[]> {
  vi.resetModules();
  // allowJs resolves the config directly; only headers() is used here.
  const config = (await import('../next.config.mjs')).default;
  const rules = await config.headers();
  return rules[0].headers as Header[];
}

async function policy(): Promise<string> {
  const found = (await headers()).find((entry) => entry.key === 'Content-Security-Policy');
  return found!.value;
}

/** Reads one directive back out of the serialised policy. */
function directive(csp: string, name: string): string[] | undefined {
  const found = csp.split('; ').find((part) => part === name || part.startsWith(`${name} `));
  return found?.split(' ').slice(1);
}

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('SUPABASE_URL', SUPABASE_URL);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('what the policy refuses', () => {
  it('closes every source it does not need', async () => {
    const csp = await policy();

    expect(directive(csp, 'default-src')).toEqual(["'self'"]);
    expect(directive(csp, 'object-src')).toEqual(["'none'"]);
    expect(directive(csp, 'frame-src')).toEqual(["'none'"]);
    // Without this an injected <base> silently re-points every relative URL.
    expect(directive(csp, 'base-uri')).toEqual(["'none'"]);
    // Without this an injected form posts the visitor's details elsewhere.
    expect(directive(csp, 'form-action')).toEqual(["'self'"]);
  });

  it('allows no outside origin to serve a script', async () => {
    const scriptSrc = directive(await policy(), 'script-src') ?? [];

    expect(scriptSrc).toContain("'self'");
    expect(scriptSrc.some((source) => source.startsWith('http'))).toBe(false);
    expect(scriptSrc).not.toContain('*');
  });

  it('never ships unsafe-eval to production', async () => {
    // Present in development for React Refresh and nowhere else.
    expect(await policy()).not.toContain("'unsafe-eval'");
  });

  it('upgrades anything still asking for http', async () => {
    expect(await policy()).toContain('upgrade-insecure-requests');
  });
});

describe('the one origin the browser may talk to', () => {
  it('allows the storage bucket, because uploads go straight there', async () => {
    // The browser PUTs an order's documents to a signed URL on this origin. A
    // connect-src of 'self' alone would block every upload.
    expect(directive(await policy(), 'connect-src')).toEqual(["'self'", SUPABASE_URL]);
  });

  it('says so loudly when the URL is missing rather than guessing', async () => {
    vi.stubEnv('SUPABASE_URL', '');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(directive(await policy(), 'connect-src')).toEqual(["'self'"]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('uploads will be blocked'));
  });

  it('does not wildcard the storage provider', async () => {
    const csp = await policy();

    expect(csp).not.toContain('*.supabase.co');
    expect(csp).not.toContain("'unsafe-hashes'");
  });
});

describe('agreement with the older header', () => {
  it('does not contradict X-Frame-Options', async () => {
    const served = await headers();

    const xfo = served.find((entry) => entry.key === 'X-Frame-Options');
    const csp = served.find((entry) => entry.key === 'Content-Security-Policy');

    // SAMEORIGIN and frame-ancestors 'self' say the same thing. Browsers that
    // understand both must not be given two different answers.
    expect(xfo!.value).toBe('SAMEORIGIN');
    expect(directive(csp!.value, 'frame-ancestors')).toEqual(["'self'"]);
  });
});
