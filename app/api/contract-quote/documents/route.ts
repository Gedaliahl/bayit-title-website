// Called by the browser once the contract pages have finished uploading.
//
// Nothing is recorded in a table here — the lead already is, and a quote has
// no document table of its own — so this does one thing: it checks that the
// paths the browser names are really under this lead's folder and really in
// the bucket, signs a link to each, and sends the office the email it needs to
// open the contract. Holding a lead id is not enough to plant a page: writing
// to the folder needs a signed upload URL that only the sender received.
import { NextResponse } from 'next/server';

import { confirmQuoteDocumentsSchema, fieldErrors } from '@/lib/schemas';
import { requireServiceClient } from '@/lib/supabase';
import { notify } from '@/lib/submissions';
import { isPathForQuote } from '@/lib/documents';
import { isWithinConfirmWindow, signQuoteDocuments } from '@/lib/document-storage';
import { site } from '@/lib/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
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
    // is a reply to the office's email, where a person sees it.
    if (!isWithinConfirmWindow(lead.created_at)) {
      return NextResponse.json({ error: 'That request is no longer accepting pages.' }, { status: 409 });
    }

    const signed = await signQuoteDocuments(leadId, own);

    if (signed.length > 0) {
      await notify(`Contract pages from ${lead.full_name}: ${signed.length} file(s)`, [
        `${signed.length} page(s) of the contract from ${lead.full_name} <${lead.email ?? 'no email'}>.`,
        `Lead id: ${leadId}`,
        '',
        ...signed.map((doc) =>
          [
            `${doc.originalName} (${Math.round(doc.sizeBytes / 1024)} KB)`,
            doc.downloadUrl ?? 'Link unavailable — open the file from Supabase Storage.',
            '',
          ].join('\n'),
        ),
        'These links expire in a week.',
        'The page promises the sender the contract is kept only as long as the quote is open',
        `unless they open an order: once the figure has gone out, delete quotes/${leadId}/ from`,
        'the bucket, or move the pages into the title file if an order follows.',
      ]);
    }

    return NextResponse.json({ ok: true, recorded: signed.length });
  } catch (error) {
    console.error('[api/contract-quote/documents] failed:', error);
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
