// The third way in on /estimate: a signed contract, sent to the office for
// exact pricing.
//
// It is a lead, not an order — nobody has asked us to open a file — so it is
// written to `leads` and the office is told, in that order, exactly as the
// quote form does it. The difference is the contract itself. The pages never
// pass through this function: as with an order's documents, the browser is
// handed one signed URL per page and PUTs the bytes straight into the private
// bucket, under `quotes/<lead id>/`. That keeps the service-role key on the
// server, keeps a 25 MB contract clear of the request-body limit, and means a
// closed tab costs the office a page rather than the whole request.
//
// The page promises that what arrives here is read by a person, not sold, and
// not kept past the quote unless an order is opened. The notification says the
// same to the office, because the bucket has no purge job and the promise is
// kept by hand until it has one.
import { NextResponse } from 'next/server';

import { contractQuoteSchema, fieldErrors } from '@/lib/schemas';
import { requireServiceClient } from '@/lib/supabase';
import { hashIp, isRateLimited, notify } from '@/lib/submissions';
import {
  MAX_CONTRACT_TOTAL_BYTES,
  MAX_FILE_BYTES,
  MAX_FILES,
  isContractFile,
} from '@/lib/documents';
import { mintUploadTickets } from '@/lib/document-storage';
import { UPLOAD } from '@/content/estimate';
import { site } from '@/lib/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HOURLY_LIMIT = 5;

const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  UPLOAD.role.options.map((option) => [option.value, option.label]),
);

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected JSON.' }, { status: 400 });
  }

  const parsed = contractQuoteSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ errors: fieldErrors(parsed.error) }, { status: 422 });
  }

  const { company, documents, role, message, ...person } = parsed.data;

  // Honeypot tripped: answer as though it worked, write nothing.
  if (company) return NextResponse.json({ ok: true });

  // The browser applies the same three rules for an immediate message. This
  // is the gate: a PDF or a photo, no page over the bucket's own limit, and
  // the whole contract inside what the copy promises.
  const readable = documents
    .filter((doc) => isContractFile(doc.name) && doc.size <= MAX_FILE_BYTES)
    .slice(0, MAX_FILES);

  if (readable.length === 0) {
    return NextResponse.json({ errors: { documents: UPLOAD.errors.noFiles } }, { status: 422 });
  }

  const total = readable.reduce((sum, doc) => sum + doc.size, 0);
  if (total > MAX_CONTRACT_TOTAL_BYTES) {
    return NextResponse.json({ errors: { documents: UPLOAD.errors.tooLarge } }, { status: 422 });
  }

  const ipHash = hashIp(request);
  const roleLabel = ROLE_LABELS[role] ?? role;

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
      .insert({
        ...person,
        // The nearest of the sources the table knows. What sets it apart from
        // a quote-form lead is said in the message and the page path.
        source: 'quote',
        role: roleLabel,
        transaction_type: role === 'borrower' ? 'refinance' : undefined,
        message: ['Contract sent for exact pricing from /estimate.', message?.trim() || null]
          .filter(Boolean)
          .join('\n\n'),
        ip_hash: ipHash,
      })
      .select('id')
      .single();

    if (error) throw new Error(error.message);

    // Minted after the lead is safely stored, never before.
    const uploads = await mintUploadTickets(data.id, readable, 'quotes');

    await notify(`Contract for pricing: ${person.full_name}`, [
      `name: ${person.full_name}`,
      `email: ${person.email}`,
      person.phone ? `phone: ${person.phone}` : 'phone: not given — write back rather than call',
      `role: ${roleLabel}`,
      message?.trim() ? `note: ${message.trim()}` : 'note: none',
      '',
      `Lead id: ${data.id}`,
      uploads.length > 0
        ? `Contract: ${uploads.length} page${uploads.length === 1 ? '' : 's'} being uploaded — a second email follows with the links.`
        : 'Contract: the pages could not be accepted for upload. Ask the sender to email them.',
      '',
      'The page promises the sender an itemised figure within one business day of a readable contract.',
    ]);

    return NextResponse.json({ ok: true, lead_id: data.id, uploads }, { status: 201 });
  } catch (error) {
    console.error('[api/contract-quote] failed:', error);
    return NextResponse.json({ error: UPLOAD.errors.failed }, { status: 500 });
  }
}
