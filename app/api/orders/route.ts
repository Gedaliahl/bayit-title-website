import { NextResponse } from 'next/server';

import { orderSchema, fieldErrors } from '@/lib/schemas';
import { requireServiceClient } from '@/lib/supabase';
import { hashIp, isRateLimited, notify, describeSubmission } from '@/lib/submissions';
import { contentTypeFor, MAX_FILES, MAX_FILE_BYTES, MAX_TOTAL_BYTES } from '@/lib/documents';
import { mintUploadTickets } from '@/lib/document-storage';
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

  const { company, documents, ...order } = parsed.data;
  if (company) return NextResponse.json({ ok: true });

  // The browser checks these too, for an immediate message. This is the gate.
  const declared = (documents ?? [])
    .filter((doc) => contentTypeFor(doc.name) !== null && doc.size <= MAX_FILE_BYTES)
    .slice(0, MAX_FILES);

  let running = 0;
  const accepted = declared.filter((doc) => {
    running += doc.size;
    return running <= MAX_TOTAL_BYTES;
  });

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

    // Minted after the order is safely stored, never before. If issuing them
    // fails the order still stands and the office still hears about it.
    const uploads = accepted.length > 0 ? await mintUploadTickets(data.id, accepted) : [];

    // Sent now rather than after the uploads finish: a closed tab must never
    // cost the office an order. The documents follow in their own notification.
    await notify(`New title order ${data.reference}: ${order.property_address}`, [
      ...describeSubmission(order),
      '',
      `Reference: ${data.reference}`,
      `Order id: ${data.id}`,
      uploads.length > 0
        ? `Documents: ${uploads.length} being uploaded — a second email follows with the links.`
        : 'Documents: none attached.',
    ]);

    return NextResponse.json(
      { ok: true, reference: data.reference, order_id: data.id, uploads },
      { status: 201 },
    );
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
