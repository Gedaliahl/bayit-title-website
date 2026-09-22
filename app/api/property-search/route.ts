// The address box on /estimate asks this what it should offer, on every few
// keystrokes.
//
// It is a POST, and not because anything is created. A GET would put half of
// somebody's home address in a URL, and URLs are written to access logs at
// every hop that handles them. Nothing about a property address is secret —
// the tax roll it is looked up on is a public record — but this site tells
// readers it does not keep what they type, and a request line in a log is
// keeping it. The body of a POST is not logged anywhere here. The county,
// Census and Esri services this asks do receive the address, in their own
// request URLs; the page says so.
//
// Nothing is written to the database and nothing is emailed. The route reads
// public county rolls and the Census geocoder and answers; see the module
// comment in lib/property-lookup.ts for what each of those is and is not.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createRateLimiter, fingerprintRequired, signLookup } from '@/lib/lookup-guard';
import { hashIp } from '@/lib/submissions';
import { searchProperties, type OfferedSuggestion } from '@/lib/property-lookup';

export const runtime = 'nodejs';

/** The search's own deadline is six seconds; this is the platform's backstop behind it. */
export const maxDuration = 10;

/**
 * The whole search, every county and geocoder in it, gets this long. A
 * dropdown that arrives later than this is answering a question the reader
 * has already stopped asking.
 */
const SEARCH_DEADLINE_MS = 6_000;

const searchSchema = z.object({
  // Longer than any Florida situs address; a query this size is not a mistyped
  // street and there is nothing useful to do with it.
  q: z.string().trim().min(1).max(160),
});

/**
 * A ceiling on how often one caller may reach the county services through us.
 *
 * The forms count their rate limit in the database because serverless
 * instances do not share memory. That is the right trade there — a lost lead
 * matters — and the wrong one here: this endpoint fires while somebody types,
 * so a database round trip per keystroke would cost more than the query it is
 * protecting. See lib/lookup-guard.ts for what else stands behind it.
 */
const isRateLimited = createRateLimiter(60_000, 90);

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected JSON.' }, { status: 400 });
  }

  const parsed = searchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ suggestions: [], status: 'ok' });
  }

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

  try {
    const { suggestions, status } = await searchProperties(
      parsed.data.q,
      AbortSignal.any([request.signal, AbortSignal.timeout(SEARCH_DEADLINE_MS)]),
    );

    // Each lookup is signed as it leaves, so /api/parcel-value can tell one
    // this page offered from one somebody wrote.
    const offered: OfferedSuggestion[] = suggestions.map((suggestion) => ({
      ...suggestion,
      lookupToken: suggestion.valueLookup
        ? signLookup({
            address: suggestion.address,
            countyName: suggestion.countyName,
            parcelId: suggestion.parcelId,
            lookup: suggestion.valueLookup,
          })
        : null,
    }));

    // The rolls are public records and the answer is the same for everyone who
    // types the same thing, but it is still a street somebody is standing on:
    // no shared cache holds it.
    return NextResponse.json(
      { suggestions: offered, status },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    // An address box that cannot reach a county is a box you type a number
    // into, which is what it was before. It is not an error page — but it is
    // not "no property found" either, and the page says which.
    console.error('[api/property-search] failed:', error);
    return NextResponse.json(
      { suggestions: [], status: 'unavailable' },
      { headers: { 'cache-control': 'no-store' } },
    );
  }
}
