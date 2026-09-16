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
// Like the search route it is a POST, writes nothing and keeps nothing; see the
// note there for why the address does not travel in a URL.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { hashIp } from '@/lib/submissions';
import { resolveParcelValue, type ValueLookup } from '@/lib/property-lookup';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const lookupSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('point'),
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
  }),
  z.object({
    kind: z.literal('jacksonville'),
    // Base64 of the locator's own reference, which is as long as it is.
    magicKey: z.string().min(1).max(512),
  }),
]);

const requestSchema = z.object({
  address: z.string().trim().min(1).max(160),
  countyName: z.string().trim().min(1).max(80),
  /** The county's own number for the parcel, where its address service gave one. */
  parcelId: z.string().trim().max(60).nullish(),
  lookup: lookupSchema,
});

/**
 * Deliberately tighter than the search route's: one of these fires when
 * somebody picks a property, not while they type, so a caller making them at
 * speed is not a person using the page.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const callers = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(fingerprint: string | null): boolean {
  if (!fingerprint) return false;

  const now = Date.now();
  const seen = callers.get(fingerprint);

  if (!seen || seen.resetAt <= now) {
    callers.set(fingerprint, { count: 1, resetAt: now + WINDOW_MS });
    if (callers.size > 2_000) {
      for (const [key, entry] of callers) if (entry.resetAt <= now) callers.delete(key);
    }
    return false;
  }

  seen.count += 1;
  return seen.count > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected JSON.' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ value: null }, { status: 422 });

  if (isRateLimited(hashIp(request))) {
    return NextResponse.json(
      { error: 'That is more lookups than we can pass on in a minute.' },
      { status: 429 },
    );
  }

  try {
    const value = await resolveParcelValue(
      parsed.data.lookup as ValueLookup,
      parsed.data.address,
      parsed.data.countyName,
      parsed.data.parcelId ?? null,
    );

    // A null here is not a failure: it is the layer declining to confirm that
    // the parcel under that point is the property that was picked. The page
    // says so and leaves the box to the reader.
    return NextResponse.json({ value }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    console.error('[api/parcel-value] failed:', error);
    return NextResponse.json({ value: null });
  }
}
