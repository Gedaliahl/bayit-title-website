// Who may spend a lookup, and how many of them.
//
// /api/parcel-value used to take whatever lookup it was handed: any point, any
// Jacksonville key, any Esri magicKey. The last of those is a billed geocode,
// so the endpoint was a way to spend this site's Esri account from anywhere.
// Two things close that. /api/property-search signs every lookup it hands out,
// with an expiry, and /api/parcel-value refuses a lookup it did not sign — so
// the only lookups it will run are ones a person typing into the page was
// offered. And both routes count callers with the one limiter below.
//
// The limiter counts in this process's memory, which on serverless is per
// instance and forgets on a cold start. That is weak on its own and it is not
// meant to stand alone: it is the part that lives in the code, beside a rate
// rule on /api/* at the platform's edge, and the daily ceiling on geocodes in
// lib/geocoder.ts.
import 'server-only';

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import type { ValueLookup } from './property-lookup';

/**
 * A caller's allowance per window, counted per fingerprint.
 *
 * Nothing else clears the map, so expired entries are swept whenever it grows
 * past a couple of thousand: without that a long-lived instance holds a
 * fingerprint for every caller it has ever answered.
 */
export function createRateLimiter(windowMs: number, maxPerWindow: number) {
  const callers = new Map<string, { count: number; resetAt: number }>();

  return function isRateLimited(fingerprint: string, now = Date.now()): boolean {
    const seen = callers.get(fingerprint);

    if (!seen || seen.resetAt <= now) {
      callers.set(fingerprint, { count: 1, resetAt: now + windowMs });
      if (callers.size > 2_000) {
        for (const [key, entry] of callers) if (entry.resetAt <= now) callers.delete(key);
      }
      return false;
    }

    seen.count += 1;
    return seen.count > maxPerWindow;
  };
}

/**
 * Whether a request with no fingerprint is turned away. In production every
 * request through the platform carries the caller's address, so one without
 * it did not come through the front door; locally there is nothing to count.
 */
export function fingerprintRequired(): boolean {
  return process.env.NODE_ENV === 'production';
}

/** Long enough to read the dropdown, pick, and change one's mind; short enough to be worthless kept. */
const TOKEN_TTL_MS = 60 * 60 * 1000;

let processKey: Buffer | null = null;

/**
 * LOOKUP_SIGNING_SECRET where it is set. Failing that, a key derived from the
 * Supabase service-role key, which every deployment of this site already has
 * and keeps server-side: an HMAC of a fixed label under it, so the signing key
 * gives nothing away about the key it came from, and rotating the service key
 * simply invalidates the lookups in flight. Failing both — a checkout with no
 * environment — a random key for this process, which works on one machine and
 * is why production should have one of the other two.
 */
function signingKey(): Buffer {
  const explicit = process.env.LOOKUP_SIGNING_SECRET?.trim();
  if (explicit) return Buffer.from(explicit, 'utf8');

  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (service) return createHmac('sha256', service).update('bayittitle lookup signing').digest();

  processKey ??= randomBytes(32);
  return processKey;
}

export interface SignedFields {
  address: string;
  countyName: string;
  parcelId: string | null;
  lookup: ValueLookup;
}

/** The fields in a fixed order, so the browser's round trip through JSON cannot reorder them. */
function claim(fields: SignedFields): string {
  const { lookup } = fields;
  const parts =
    lookup.kind === 'point'
      ? [lookup.kind, lookup.lat, lookup.lon]
      : lookup.kind === 'esri'
        ? [lookup.kind, lookup.magicKey, lookup.text]
        : [lookup.kind, lookup.magicKey];
  return JSON.stringify([fields.address, fields.countyName, fields.parcelId ?? '', parts]);
}

function mac(expiresAt: number, fields: SignedFields): Buffer {
  return createHmac('sha256', signingKey()).update(`${expiresAt}.${claim(fields)}`).digest();
}

export function signLookup(fields: SignedFields, now = Date.now()): string {
  const expiresAt = now + TOKEN_TTL_MS;
  return `${expiresAt}.${mac(expiresAt, fields).toString('base64url')}`;
}

export type TokenCheck = 'valid' | 'expired' | 'invalid';

export function checkLookupToken(
  token: string | null | undefined,
  fields: SignedFields,
  now = Date.now(),
): TokenCheck {
  const match = token ? /^(\d{1,16})\.([A-Za-z0-9_-]{43})$/.exec(token) : null;
  if (!match) return 'invalid';

  const expiresAt = Number(match[1]);
  const given = Buffer.from(match[2], 'base64url');
  const expected = mac(expiresAt, fields);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return 'invalid';

  // Checked after the signature, so an expiry nobody signed is invalid rather than expired.
  return expiresAt > now ? 'valid' : 'expired';
}
