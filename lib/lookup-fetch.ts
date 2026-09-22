// Every request the address lookup makes to somebody else's service goes
// through here, because three things about them are easy to get wrong one call
// site at a time.
//
// The first is caching. ArcGIS answers a refused query with HTTP 200 and an
// `error` in the body, so a cache that keys on the status code — which is what
// Next's fetch cache does — holds that refusal for every reader for an hour
// and a county's rows vanish from the dropdown until it expires. So nothing
// here goes to the shared fetch cache at all: requests are `no-store`, and the
// answers worth keeping are kept in a small cache in this process's memory,
// which only ever holds a body that parsed and carried no error.
//
// The second is that anything derived from Esri's geocoder is not cached at
// all, which is the condition its cheaper geocode is sold on; the caller says
// so per request.
//
// The third is manners. These are public services run by county offices, and
// a request that names who is asking lets the person reading their logs find
// out, rather than block an anonymous address.
import 'server-only';

import { createHash } from 'node:crypto';

import { site } from './site';

const USER_AGENT = `bayittitle.com property lookup (+${site.url}/contact)`;

/**
 * An hour, and a few hundred answers. A roll moves once a year, so an hour is
 * never the reason a figure is wrong; the bound is what stops a long-lived
 * instance holding every prefix anybody has typed.
 */
const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 400;

const cache = new Map<string, { body: unknown; expiresAt: number }>();

/**
 * Keyed on a hash of the URL rather than the URL, so the cache's own keys are
 * not a list of the addresses people typed.
 */
const cacheKey = (url: string) => createHash('sha256').update(url).digest('hex');

function cached(key: string): unknown | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }
  // Re-inserted, so the map's insertion order is least recently used first.
  cache.delete(key);
  cache.set(key, entry);
  return entry.body;
}

function remember(key: string, body: unknown) {
  cache.set(key, { body, expiresAt: Date.now() + CACHE_TTL_MS });
  while (cache.size > CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

/** For the tests, which would otherwise see one another's answers. */
export function clearLookupCache() {
  cache.clear();
}

export interface LookupRequest {
  timeoutMs: number;
  /** The caller's overall deadline, and the reader leaving; either ends the request. */
  signal?: AbortSignal;
  /** False for anything Esri's geocoder produced, which may not be kept. */
  cacheable: boolean;
  /** Where the log line says the failure was. */
  label: string;
}

/**
 * The parsed body of a JSON request, or null where there is no answer to use:
 * a network failure, a timeout, a status that is not 200, or a 200 that is an
 * ArcGIS error. The four are logged differently and treated alike, because to
 * the reader they are all "that service did not answer".
 */
export async function fetchLookupJson(url: string, options: LookupRequest): Promise<unknown | null> {
  const key = options.cacheable ? cacheKey(url) : null;
  if (key) {
    const hit = cached(key);
    if (hit !== undefined) return hit;
  }

  const host = new URL(url).host;

  try {
    const timeout = AbortSignal.timeout(options.timeoutMs);
    const response = await fetch(url, {
      signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
      cache: 'no-store',
      headers: { accept: 'application/json', 'user-agent': USER_AGENT },
    });
    if (!response.ok) {
      console.warn(`[${options.label}] ${host} answered ${response.status}`);
      return null;
    }

    const body: unknown = await response.json();
    if (body && typeof body === 'object' && 'error' in body && body.error) {
      console.warn(`[${options.label}] ${host} refused the query`);
      return null;
    }

    if (key) remember(key, body);
    return body;
  } catch (error) {
    // One service being down is a missing suggestion, never a failed page.
    console.warn(
      `[${options.label}] ${host} failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}
