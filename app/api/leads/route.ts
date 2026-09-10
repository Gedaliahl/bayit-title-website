import { NextResponse } from 'next/server';

import { leadSchema, fieldErrors } from '@/lib/schemas';
import { requireServiceClient } from '@/lib/supabase';
import { hashIp, isRateLimited, notify, describeSubmission } from '@/lib/submissions';
import { site } from '@/lib/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HOURLY_LIMIT = 5;

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected JSON.' }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ errors: fieldErrors(parsed.error) }, { status: 422 });
  }

  const { company, ...lead } = parsed.data;

  // Honeypot tripped. Answer as though it succeeded so the bot stops retrying,
  // but write nothing.
  if (company) return NextResponse.json({ ok: true });

  const ipHash = hashIp(request);

  try {
    if (await isRateLimited('leads', ipHash, HOURLY_LIMIT)) {
      return NextResponse.json(
        { error: `That is more requests than we can take in an hour. Call ${site.phoneDisplay}.` },
        { status: 429 },
      );
    }

    const supabase = requireServiceClient();
    const { data, error } = await supabase
      .from('leads')
      .insert({ ...lead, ip_hash: ipHash })
      .select('id')
      .single();

    if (error) throw new Error(error.message);

    // Persisted first, then notified: a mail failure must not lose the lead.
    await notify(
      `Website ${lead.source}: ${lead.full_name}`,
      [...describeSubmission(lead), '', `Lead id: ${data.id}`],
    );

    return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
  } catch (error) {
    console.error('[api/leads] failed:', error);
    return NextResponse.json(
      {
        error: `We could not record that. Please email ${site.email} or call ${site.phoneDisplay}.`,
      },
      { status: 500 },
    );
  }
}
