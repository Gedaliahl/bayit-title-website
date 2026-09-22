/**
 * The checks between the public internet and the services the address lookup
 * spends: a signature on every lookup the search hands out, a limit per
 * caller, a ceiling on billed geocodes, and a cache that will not keep an
 * error.
 *
 * Each is a small decision that fails quietly when it is wrong — an unsigned
 * lookup that runs, a refusal cached for an hour — so each is pinned here.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { geocodeSuggestion } from '@/lib/geocoder';
import { clearLookupCache, fetchLookupJson } from '@/lib/lookup-fetch';
import { checkLookupToken, createRateLimiter, signLookup, type SignedFields } from '@/lib/lookup-guard';

const FIELDS: SignedFields = {
  address: '4304 Herschel St',
  countyName: 'Duval County',
  parcelId: null,
  lookup: { kind: 'point', lat: 30.282966, lon: -81.713727 },
};

const HOUR = 60 * 60 * 1000;

describe('a signed lookup', () => {
  beforeEach(() => {
    vi.stubEnv('LOOKUP_SIGNING_SECRET', 'a test secret that is long enough');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('runs as it was handed out, after a round trip through JSON', () => {
    const token = signLookup(FIELDS, 1_000_000);
    const returned = JSON.parse(JSON.stringify(FIELDS)) as SignedFields;
    expect(checkLookupToken(token, returned, 1_000_000 + 1_000)).toBe('valid');
  });

  it('does not run with anything changed', () => {
    const token = signLookup(FIELDS, 1_000_000);
    const moved = { ...FIELDS, lookup: { kind: 'point' as const, lat: 30.3, lon: -81.713727 } };
    expect(checkLookupToken(token, moved, 1_000_000)).toBe('invalid');
    expect(checkLookupToken(token, { ...FIELDS, address: '4306 Herschel St' }, 1_000_000)).toBe(
      'invalid',
    );
    // A magicKey of somebody's choosing is exactly what this is here to stop.
    expect(
      checkLookupToken(token, { ...FIELDS, lookup: { kind: 'esri', magicKey: 'x', text: 'y' } }, 1_000_000),
    ).toBe('invalid');
  });

  it('does not run without a token, or with one nobody signed', () => {
    expect(checkLookupToken(undefined, FIELDS)).toBe('invalid');
    expect(checkLookupToken('not a token', FIELDS)).toBe('invalid');
    const [, mac] = signLookup(FIELDS, 1_000_000).split('.');
    // The same signature with a later expiry written in front of it.
    expect(checkLookupToken(`${1_000_000 + 10 * HOUR}.${mac}`, FIELDS, 1_000_000)).toBe('invalid');
  });

  it('expires after an hour', () => {
    const token = signLookup(FIELDS, 1_000_000);
    expect(checkLookupToken(token, FIELDS, 1_000_000 + HOUR + 1)).toBe('expired');
  });

  it('does not survive a change of secret', () => {
    const token = signLookup(FIELDS, 1_000_000);
    vi.stubEnv('LOOKUP_SIGNING_SECRET', 'another secret altogether');
    expect(checkLookupToken(token, FIELDS, 1_000_000)).toBe('invalid');
  });
});

describe('the limit per caller', () => {
  it('lets the allowance through, stops the next, and starts again with the window', () => {
    const isRateLimited = createRateLimiter(60_000, 3);
    const now = 5_000_000;

    expect([1, 2, 3].map(() => isRateLimited('caller', now))).toEqual([false, false, false]);
    expect(isRateLimited('caller', now + 1)).toBe(true);
    // Somebody else is counted apart.
    expect(isRateLimited('someone else', now + 1)).toBe(false);
    expect(isRateLimited('caller', now + 60_000)).toBe(false);
  });
});

describe('the answers kept between searches', () => {
  beforeEach(() => {
    clearLookupCache();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const request = { timeoutMs: 1_000, cacheable: true, label: 'test' };

  it('never include an ArcGIS error, which arrives as HTTP 200', async () => {
    const fetch = vi.fn(async () => Response.json({ error: { code: 400 } }));
    vi.stubGlobal('fetch', fetch);

    expect(await fetchLookupJson('https://example.test/query?a', request)).toBeNull();
    expect(await fetchLookupJson('https://example.test/query?a', request)).toBeNull();
    // Asked again the second time, rather than refused from memory.
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('include an answer, so the same question is not sent twice', async () => {
    const fetch = vi.fn(async () => Response.json({ features: [] }));
    vi.stubGlobal('fetch', fetch);

    await fetchLookupJson('https://example.test/query?b', request);
    expect(await fetchLookupJson('https://example.test/query?b', request)).toEqual({ features: [] });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('never include what the caller says may not be kept', async () => {
    const fetch = vi.fn(async () => Response.json({ candidates: [] }));
    vi.stubGlobal('fetch', fetch);

    const uncached = { ...request, cacheable: false };
    await fetchLookupJson('https://example.test/query?c', uncached);
    await fetchLookupJson('https://example.test/query?c', uncached);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('are asked for with a name on the request', async () => {
    const fetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      Response.json({ features: [] }),
    );
    vi.stubGlobal('fetch', fetch);

    await fetchLookupJson('https://example.test/query?d', request);
    const init = fetch.mock.calls[0][1];
    expect(init?.cache).toBe('no-store');
    expect((init?.headers as Record<string, string>)['user-agent']).toMatch(/bayittitle\.com/);
  });
});

describe('the ceiling on billed geocodes', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('stops geocoding for the day once it is reached', async () => {
    vi.stubEnv('ARCGIS_API_KEY', 'test-key');
    vi.stubEnv('ESRI_DAILY_GEOCODE_CAP', '1');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetch = vi.fn(async (_input: RequestInfo | URL) =>
      Response.json({
        candidates: [
          { location: { x: -82.57, y: 27.49 }, attributes: { Addr_type: 'PointAddress', StAddr: '1832 Manatee Ave E' } },
        ],
      }),
    );
    vi.stubGlobal('fetch', fetch);

    const text = '1832 Manatee Ave E, Bradenton, FL, 34208, USA';
    expect(await geocodeSuggestion('key-1', text)).toMatchObject({ rooftop: true });
    expect(await geocodeSuggestion('key-2', text)).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);

    // Sent with the suggestion's own text, as Esri asks for a magicKey to be.
    expect(new URL(String(fetch.mock.calls[0][0])).searchParams.get('singleLine')).toBe(text);
  });
});
