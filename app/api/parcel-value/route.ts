// The second half of an address lookup, for the counties that publish where
// their addresses are but not what they are worth.
//
// /api/property-search answers the typing. This answers the picking: given the
// address somebody chose and the coordinate or key that came with it, it finds
// the parcel on the Department of Revenue's statewide layer and reads the
// values off it. It is a separate request because it is a slower one — a
// second or two against the tenth of a second a dropdown can afford — and
// because it is asked once per property rather than once per keystroke.
//
// It runs only lookups the search route signed. One of the kinds is a billed
// Esri geocode, and an endpoint that took any key it was handed would be a way
// to spend this site's account from anywhere; see lib/lookup-guard.ts.
//
// Like the search route it is a POST, writes nothing and keeps nothing; see the
// note there for why the address does not travel in a URL.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  checkLookupToken,
  createRateLimiter,
  fingerprintRequired,
} from '@/lib/lookup-guard';
import { hashIp } from '@/lib/submissions';
import { resolveParcelValue, type ValueLookup } from '@/lib/property-lookup';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The statewide roll can take nine seconds to answer and a retry twenty more,
 * on top of a geocode; this is room for that and not much besides.
 */
export const maxDuration = 45;

const lookupSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('point'),
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
  }),
  z.object({
    kind: z.literal('esri'),
    magicKey: z.string().trim().min(1).max(512),
    text: z.string().trim().min(1).max(200),
  }),
  z.object({
    kind: z.literal('jacksonville'),
    // Base64 of the locator's own reference, which is as long as it is.
    magicKey: z.string().min(1).max(512),
  }),
]);

const requestSchema = z.object({
  address: z.string().trim().min(1).max(160),
  // A statewide geocoder's suggestion has no county until it is resolved.
  countyName: z.string().trim().max(80),
  /** The county's own number for the parcel, where its address service gave one. */
  parcelId: z.string().trim().max(60).nullish(),
  lookup: lookupSchema,
  token: z.string().max(100),
});

/**
 * Deliberately tighter than the search route's: one of these fires when
 * somebody picks a property, not while they type, so a caller making them at
 * speed is not a person using the page.
 */
const isRateLimited = createRateLimiter(60_000, 20);

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected JSON.' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ status: 'invalid' }, { status: 422 });

  const fingerprint = hashIp(request);
  if (!fingerprint && fingerprintRequired()) {
    return NextResponse.json({ error: 'Unidentified request.' }, { status: 403 });
  }

  if (fingerprint && isRateLimited(fingerprint)) {
    return NextResponse.json(
      { error: 'That is more lookups than we can pass on in a minute.', status: 'rate-limited' },
      { status: 429 },
    );
  }

  const { address, countyName, lookup, token } = parsed.data;
  const parcelId = parsed.data.parcelId ?? null;

  const signed = checkLookupToken(token, {
    address,
    countyName,
    parcelId,
    lookup: lookup as ValueLookup,
  });
  if (signed === 'expired') {
    // An hour-old dropdown; the page asks for the property to be picked again.
    return NextResponse.json({ status: 'expired' }, { status: 403 });
  }
  if (signed !== 'valid') return NextResponse.json({ status: 'invalid' }, { status: 403 });

  try {
    const result = await resolveParcelValue(
      lookup as ValueLookup,
      address,
      countyName,
      parcelId,
      request.signal,
    );

    // Each outcome is said differently on the page. A decline is the check
    // working — the parcel under that point is not the property that was
    // picked, or is one unit of a building when no unit was picked — and
    // belongs to the reader to work around. An unavailable is somebody else's
    // server being slow, and is worth another go, so the page says which it
    // was rather than blaming the address.
    return NextResponse.json(result, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    console.error('[api/parcel-value] failed:', error);
    return NextResponse.json({ status: 'unavailable' }, { headers: { 'cache-control': 'no-store' } });
  }
}
