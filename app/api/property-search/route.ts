// The address box on /estimate asks this what it should offer, on every few
// keystrokes.
//
// It is a POST, and not because anything is created. A GET would put half of
// somebody's home address in a URL, and URLs are written to access logs at
// every hop that handles them. Nothing about a property address is secret —
// the tax roll it is looked up on is a public record — but this site tells
// readers it does not keep what they type, and a request line in a log is
// keeping it. The body of a POST is not logged anywhere here.
//
// Nothing is written to the database and nothing is emailed. The route reads
// public county rolls and the Census geocoder and answers; see the module
// comment in lib/property-lookup.ts for what each of those is and is not.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { hashIp } from '@/lib/submissions';
import { searchProperties } from '@/lib/property-lookup';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
 * protecting. An in-process counter that resets on a cold start still stops the
 * one thing worth stopping, which is a script pointing itself at a county's
 * public service through our origin.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 90;
const callers = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(fingerprint: string | null): boolean {
  if (!fingerprint) return false;

  const now = Date.now();
  const seen = callers.get(fingerprint);

  if (!seen || seen.resetAt <= now) {
    callers.set(fingerprint, { count: 1, resetAt: now + WINDOW_MS });

    // Nothing else clears this map, so expired entries are swept whenever a
    // window rolls over. Without it a long-lived instance holds a fingerprint
    // for every caller it has ever answered.
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

  const parsed = searchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ suggestions: [] });
  }

  if (isRateLimited(hashIp(request))) {
    return NextResponse.json(
      { error: 'That is more lookups than we can pass on in a minute.' },
      { status: 429 },
    );
  }

  try {
    const suggestions = await searchProperties(parsed.data.q);

    // The rolls are public records and the answer is the same for everyone who
    // types the same thing, but it is still a street somebody is standing on:
    // no shared cache holds it.
    return NextResponse.json(
      { suggestions },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    // An address box that cannot reach a county is a box you type a number
    // into, which is what it was before. It is not an error page.
    console.error('[api/property-search] failed:', error);
    return NextResponse.json({ suggestions: [] });
  }
}
