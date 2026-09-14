import { NextResponse } from 'next/server';

import { confirmDocumentsSchema, fieldErrors } from '@/lib/schemas';
import { requireServiceClient } from '@/lib/supabase';
import { notify } from '@/lib/submissions';
import { isPathForOrder, RETENTION_DAYS } from '@/lib/documents';
import { isWithinConfirmWindow, registerUploadedDocuments } from '@/lib/document-storage';
import { site } from '@/lib/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Called by the browser once it has finished uploading straight to storage.
 *
 * Holding an order id is not enough to plant a document here. Every path is
 * checked against the bucket before a row is written, and writing to the bucket
 * needs a signed upload URL that only the person who opened the order received.
 */
export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected JSON.' }, { status: 400 });
  }

  const parsed = confirmDocumentsSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ errors: fieldErrors(parsed.error) }, { status: 422 });
  }

  const { order_id: orderId, documents } = parsed.data;

  // Paths the server did not issue for this order are discarded outright.
  const own = documents.filter((doc) => isPathForOrder(doc.path, orderId));
  if (own.length === 0) {
    return NextResponse.json({ error: 'Those documents do not belong to that order.' }, { status: 400 });
  }

  try {
    const supabase = requireServiceClient();

    const { data: order, error } = await supabase
      .from('orders')
      .select('id, reference, property_address, created_at')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Unknown order.' }, { status: 404 });
    }

    // Documents belong to the session that opened the order. Anything later is
    // a reply to the confirmation email, where a person sees it.
    if (!isWithinConfirmWindow(order.created_at)) {
      return NextResponse.json({ error: 'That order is no longer accepting uploads.' }, { status: 409 });
    }

    const recorded = await registerUploadedDocuments(orderId, own);

    if (recorded.length > 0) {
      await notify(`Documents for ${order.reference}: ${order.property_address}`, [
        `${recorded.length} document(s) uploaded for order ${order.reference}.`,
        `Property: ${order.property_address}`,
        '',
        ...recorded.map((doc) =>
          [
            `${doc.originalName} (${Math.round(doc.sizeBytes / 1024)} KB)`,
            doc.downloadUrl ?? 'Link unavailable — open the file from Supabase Storage.',
            '',
          ].join('\n'),
        ),
        `These links expire in a week. The files themselves are purged after ${RETENTION_DAYS} days,`,
        'so move anything you need into the title file.',
      ]);
    }

    return NextResponse.json({ ok: true, recorded: recorded.length });
  } catch (error) {
    console.error('[api/orders/documents] failed:', error);
    return NextResponse.json(
      {
        // The order itself is already safe. Say so — the caller has just watched
        // an upload appear to work and needs to know what is actually true.
        error:
          `The order is recorded, but we could not attach the documents. ` +
          `Please email them to ${site.ordersEmail} or call ${site.phoneDisplay}.`,
      },
      { status: 500 },
    );
  }
}
