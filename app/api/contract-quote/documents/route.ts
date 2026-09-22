// Called by the browser once the contract pages have finished uploading.
//
// The lead is already recorded, so this does one thing: it checks that the
// paths the browser names are really under this lead's folder and really in
// the bucket, checks each page's bytes and size, signs a link to each page the
// office has not been sent yet, and sends the email it needs to open the
// contract. Holding a lead id
// is not enough to plant a page: writing to the folder needs a signed upload
// URL that only the sender received.
import { after, NextResponse } from 'next/server';

import { confirmQuoteDocumentsSchema, fieldErrors } from '@/lib/schemas';
import { requireServiceClient } from '@/lib/supabase';
import { notify, refuseForeignRequest } from '@/lib/submissions';
import { isPathForQuote } from '@/lib/documents';
import {
  DOWNLOAD_LINK_HOURS,
  describeConfirmation,
  isWithinConfirmWindow,
  quoteRetentionDays,
  signQuoteDocuments,
} from '@/lib/document-storage';
import { site } from '@/lib/site';

export const runtime = 'nodejs';

// Each page is opened to check its bytes before the office is sent a link.
export const maxDuration = 60;

export async function POST(request: Request) {
  const refused = refuseForeignRequest(request);
  if (refused) return refused;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected JSON.' }, { status: 400 });
  }

  const parsed = confirmQuoteDocumentsSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ errors: fieldErrors(parsed.error) }, { status: 422 });
  }

  const { lead_id: leadId, documents } = parsed.data;

  const own = documents.filter((doc) => isPathForQuote(doc.path, leadId));
  if (own.length === 0) {
    return NextResponse.json({ error: 'Those pages do not belong to that request.' }, { status: 400 });
  }

  try {
    const supabase = requireServiceClient();

    const { data: lead, error } = await supabase
      .from('leads')
      .select('id, full_name, email, created_at')
      .eq('id', leadId)
      .single();

    if (error || !lead) {
      return NextResponse.json({ error: 'Unknown request.' }, { status: 404 });
    }

    // The pages belong to the session that sent the contract. Anything later
    // goes to the office by email, where a person sees it.
    if (!isWithinConfirmWindow(lead.created_at)) {
      return NextResponse.json({ error: 'That request is no longer accepting pages.' }, { status: 409 });
    }

    const { kept, rejected } = await signQuoteDocuments(leadId, own);

    if (kept.length > 0 || rejected.length > 0) {
      const days = quoteRetentionDays();
      after(() =>
        notify(
          `Contract pages from ${lead.full_name}: ${kept.length} file(s)`,
          [
            `${kept.length} page(s) of the contract from ${lead.full_name} <${lead.email ?? 'no email'}>.`,
            `Lead id: ${leadId}`,
            '',
            ...describeConfirmation({ kept, rejected }),
            `These links expire in ${DOWNLOAD_LINK_HOURS} hours.`,
            `The site deletes quotes/${leadId}/ from the bucket within ${days} days of the pages arriving,`,
            'as the page promises the sender. If an order follows, move the pages into the title file before then.',
          ],
          { replyTo: lead.email ?? undefined },
        ),
      );
    }

    return NextResponse.json({ ok: true, recorded: kept.length, rejected });
  } catch (error) {
    console.error('[api/contract-quote/documents] failed:', (error as Error).message);
    return NextResponse.json(
      {
        error:
          `Your details reached us, but the contract did not. ` +
          `Please email it to ${site.ordersEmail} or call ${site.phoneDisplay}.`,
      },
      { status: 500 },
    );
  }
}
