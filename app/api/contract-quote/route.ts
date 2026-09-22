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
// not kept past the quote. The daily purge (app/api/cron/purge) keeps the last
// part: the pages are deleted from the bucket once they are older than
// quoteRetentionDays(), and the office's email says so.
import { after, NextResponse } from 'next/server';

import { HONEYPOT_FIELD, contractQuoteSchema, fieldErrors } from '@/lib/schemas';
import {
  BOT_CHECK_FAILED,
  fileAsSpam,
  hashIp,
  isRateLimited,
  notify,
  officeEmail,
  passesBotCheck,
  recordOnce,
  refuseForeignRequest,
} from '@/lib/submissions';
import { MAX_CONTRACT_TOTAL_BYTES, MAX_FILE_BYTES, isContractFile } from '@/lib/documents';
import { mintUploadTickets } from '@/lib/document-storage';
import { UPLOAD } from '@/content/estimate';
import { site } from '@/lib/site';

export const runtime = 'nodejs';

const HOURLY_LIMIT = 5;

const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  UPLOAD.role.options.map((option) => [option.value, option.label]),
);

export async function POST(request: Request) {
  const refused = refuseForeignRequest(request);
  if (refused) return refused;

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

  const {
    [HONEYPOT_FIELD]: trap,
    turnstile_token: botToken,
    submission_id: submissionId,
    documents,
    role,
    message,
    ...person
  } = parsed.data;

  if (!(await passesBotCheck(botToken))) {
    return NextResponse.json({ error: BOT_CHECK_FAILED }, { status: 403 });
  }

  const ipHash = hashIp(request);
  const roleLabel = ROLE_LABELS[role] ?? role;

  // 'calculator' is the source the table has for the estimator, and nothing
  // else writes it, which is what keeps a contract's rate limit its own.
  const lead = {
    ...person,
    source: 'calculator' as const,
    role: roleLabel,
    transaction_type: role === 'borrower' ? 'refinance' : null,
    message: ['Contract sent for exact pricing from /estimate.', message].filter(Boolean).join('\n\n'),
  };

  // Honeypot tripped: kept as spam, answered as though it worked, no tickets.
  if (trap) {
    await fileAsSpam(lead, ipHash);
    return NextResponse.json({ ok: true });
  }

  // The browser applies the same three rules for an immediate message. This
  // is the gate: a PDF or a photo, no page over the bucket's own limit, and
  // the whole contract inside what the copy promises. Each page keeps its
  // place in the browser's list, so a ticket still names the right file.
  const readable = documents
    .map((doc, index) => ({ ...doc, index }))
    .filter((doc) => isContractFile(doc.name) && doc.size <= MAX_FILE_BYTES);

  if (readable.length === 0) {
    return NextResponse.json({ errors: { documents: UPLOAD.errors.noFiles } }, { status: 422 });
  }

  const total = readable.reduce((sum, doc) => sum + doc.size, 0);
  if (total > MAX_CONTRACT_TOTAL_BYTES) {
    return NextResponse.json({ errors: { documents: UPLOAD.errors.tooLarge } }, { status: 422 });
  }

  try {
    if (await isRateLimited('quotes', ipHash, HOURLY_LIMIT)) {
      return NextResponse.json(
        { error: `That is more requests than we can take in an hour. Call ${site.phoneDisplay}.` },
        { status: 429 },
      );
    }

    const { row, duplicate } = await recordOnce<{ id: string }, 'leads'>(
      'leads',
      'id',
      submissionId,
      () => ({ ...lead, ip_hash: ipHash }),
    );

    // Minted after the lead is safely stored, never before.
    const uploads = await mintUploadTickets(row.id, readable, 'quotes');

    if (!duplicate) {
      const shortfall = documents.length - uploads.length;
      after(() =>
        notify(
          `Contract for pricing: ${person.full_name}`,
          officeEmail(
            [
              `Lead id: ${row.id}`,
              uploads.length === 0
                ? 'Contract: the pages could not be accepted for upload. Ask the sender to email them.'
                : shortfall === 0
                  ? `Contract: ${uploads.length} page${uploads.length === 1 ? '' : 's'} being uploaded — a second email follows with the links.`
                  : `Contract: ${uploads.length} of the ${documents.length} files the sender chose are being ` +
                    `uploaded. Ask them to email the other ${shortfall}.`,
              person.phone ? null : 'No phone given — write back rather than call.',
              'The page promises the sender an itemised figure within one business day of a readable contract.',
            ].filter((line): line is string => line !== null),
            { ...person, role: roleLabel, note: message },
          ),
          { replyTo: person.email },
        ),
      );
    }

    return NextResponse.json({ ok: true, lead_id: row.id, uploads }, { status: duplicate ? 200 : 201 });
  } catch (error) {
    console.error('[api/contract-quote] failed:', (error as Error).message);
    return NextResponse.json({ error: UPLOAD.errors.failed }, { status: 500 });
  }
}
