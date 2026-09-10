import { NextResponse } from 'next/server';

import { orderSchema, fieldErrors } from '@/lib/schemas';
import { requireServiceClient } from '@/lib/supabase';
import { hashIp, isRateLimited, notify, describeSubmission } from '@/lib/submissions';
import { site } from '@/lib/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HOURLY_LIMIT = 10;

/** Human-readable order reference. Not a production file number. */
function buildReference(): string {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `WEB-${stamp}-${suffix}`;
}

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected JSON.' }, { status: 400 });
  }

  const parsed = orderSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ errors: fieldErrors(parsed.error) }, { status: 422 });
  }

  const { company, ...order } = parsed.data;
  if (company) return NextResponse.json({ ok: true });

  const ipHash = hashIp(request);

  try {
    if (await isRateLimited('orders', ipHash, HOURLY_LIMIT)) {
      return NextResponse.json(
        { error: `That is more orders than we can take in an hour. Call ${site.phoneDisplay}.` },
        { status: 429 },
      );
    }

    const supabase = requireServiceClient();
    const { data, error } = await supabase
      .from('orders')
      .insert({ ...order, reference: buildReference(), ip_hash: ipHash })
      .select('id, reference')
      .single();

    if (error) throw new Error(error.message);

    await notify(
      `New title order ${data.reference}: ${order.property_address}`,
      [...describeSubmission(order), '', `Reference: ${data.reference}`, `Order id: ${data.id}`],
    );

    return NextResponse.json({ ok: true, reference: data.reference }, { status: 201 });
  } catch (error) {
    console.error('[api/orders] failed:', error);
    return NextResponse.json(
      {
        error: `We could not record that order. Please email ${site.ordersEmail} or call ${site.phoneDisplay}.`,
      },
      { status: 500 },
    );
  }
}
