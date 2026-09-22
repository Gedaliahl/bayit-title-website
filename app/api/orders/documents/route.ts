import { after, NextResponse } from 'next/server';

import { confirmDocumentsSchema, fieldErrors } from '@/lib/schemas';
import { requireServiceClient } from '@/lib/supabase';
import { notify, refuseForeignRequest } from '@/lib/submissions';
import { isPathForOrder } from '@/lib/documents';
import {
  DOWNLOAD_LINK_HOURS,
  describeConfirmation,
  isWithinConfirmWindow,
  registerUploadedDocuments,
} from '@/lib/document-storage';
import { site } from '@/lib/site';

export const runtime = 'nodejs';

// Every file is opened to check its bytes before it is recorded, and ten
// documents on a slow storage read take longer than the platform default.
export const maxDuration = 60;

/**
 * Called by the browser once it has finished uploading straight to storage.
 *
 * Holding an order id is not enough to plant a document here. Every path is
 * checked against the bucket before a row is written, and writing to the bucket
 * needs a signed upload URL that only the person who opened the order received.
 */
export async function POST(request: Request) {
  const refused = refuseForeignRequest(request);
  if (refused) return refused;

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
      .select('id, reference, property_address, ordered_by_email, created_at')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Unknown order.' }, { status: 404 });
    }

    // Documents belong to the session that opened the order. Anything later
    // goes to the office by email, where a person sees it.
    if (!isWithinConfirmWindow(order.created_at)) {
      return NextResponse.json({ error: 'That order is no longer accepting uploads.' }, { status: 409 });
    }

    const { kept, rejected } = await registerUploadedDocuments(orderId, own);

    if (kept.length > 0 || rejected.length > 0) {
      after(() =>
        notify(
          `Documents for ${order.reference}: ${order.property_address}`,
          [
            `${kept.length} document(s) uploaded for order ${order.reference}.`,
            `Property: ${order.property_address}`,
            '',
            ...describeConfirmation({ kept, rejected }),
            `These links expire in ${DOWNLOAD_LINK_HOURS} hours. Move anything you need into the title file —`,
            'the website bucket is a drop box, not a system of record.',
          ],
          { replyTo: order.ordered_by_email },
        ),
      );
    }

    return NextResponse.json({ ok: true, recorded: kept.length, rejected });
  } catch (error) {
    console.error('[api/orders/documents] failed:', (error as Error).message);
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
