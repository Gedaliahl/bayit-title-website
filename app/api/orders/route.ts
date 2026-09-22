import { randomInt } from 'node:crypto';
import { after, NextResponse } from 'next/server';

import { HONEYPOT_FIELD, orderSchema, fieldErrors } from '@/lib/schemas';
import {
  BOT_CHECK_FAILED,
  describeSubmission,
  fileAsSpam,
  hashIp,
  isRateLimited,
  notify,
  officeEmail,
  passesBotCheck,
  recordOnce,
  refuseForeignRequest,
} from '@/lib/submissions';
import { contentTypeFor, MAX_FILE_BYTES, MAX_TOTAL_BYTES } from '@/lib/documents';
import { mintUploadTickets } from '@/lib/document-storage';
import { site } from '@/lib/site';

export const runtime = 'nodejs';

const HOURLY_LIMIT = 10;

const REFERENCE_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Human-readable order reference. Not a production file number.
 *
 * Drawn from the crypto generator rather than Math.random, and the column is
 * unique, so a collision is refused by the database and the insert is simply
 * tried again with a new one (see recordOnce).
 */
function buildReference(): string {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  let suffix = '';
  for (let i = 0; i < 5; i += 1) suffix += REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)];
  return `WEB-${stamp}-${suffix}`;
}

export async function POST(request: Request) {
  const refused = refuseForeignRequest(request);
  if (refused) return refused;

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

  const {
    [HONEYPOT_FIELD]: trap,
    turnstile_token: botToken,
    submission_id: submissionId,
    documents,
    ...order
  } = parsed.data;

  if (!(await passesBotCheck(botToken))) {
    return NextResponse.json({ error: BOT_CHECK_FAILED }, { status: 403 });
  }

  const ipHash = hashIp(request);

  if (trap) {
    await fileAsSpam(
      {
        source: 'other',
        full_name: order.ordered_by_name,
        email: order.ordered_by_email,
        phone: order.ordered_by_phone,
        property_address: order.property_address,
        county_slug: order.county_slug,
        message: ['Sent from the order form and caught by the spam trap.', ...describeSubmission(order)].join('\n'),
        page_path: order.page_path,
      },
      ipHash,
    );
    return NextResponse.json({ ok: true });
  }

  // The browser checks these too, for an immediate message. This is the gate.
  // Each keeps the position it had in the browser's list, so the tickets that
  // come back still point at the right file after anything is dropped.
  let running = 0;
  const declared = documents ?? [];
  const accepted = declared
    .map((doc, index) => ({ ...doc, index }))
    .filter((doc) => contentTypeFor(doc.name) !== null && doc.size <= MAX_FILE_BYTES)
    .filter((doc) => {
      running += doc.size;
      return running <= MAX_TOTAL_BYTES;
    });

  try {
    const recorded = await recordOnce<{ id: string; reference: string }, 'orders'>(
      'orders',
      'id, reference',
      submissionId,
      () => ({ ...order, reference: buildReference(), ip_hash: ipHash }),
      async () => !(await isRateLimited('orders', ipHash, HOURLY_LIMIT)),
    );
    if (!recorded) {
      return NextResponse.json(
        { error: `That is more orders than we can take in an hour. Call ${site.phoneDisplay}.` },
        { status: 429 },
      );
    }
    const { row, duplicate } = recorded;

    // Minted after the order is safely stored, never before. If issuing them
    // fails the order still stands and the office still hears about it. A
    // repeat of an order whose answer was lost gets fresh tickets, because the
    // first ones never reached the browser.
    const uploads = accepted.length > 0 ? await mintUploadTickets(row.id, accepted) : [];

    // The office heard about this order the first time it arrived.
    if (!duplicate) {
      const shortfall = declared.length - uploads.length;
      // Sent after the response rather than before it: a slow mail provider
      // must never be the reason the sender sees an error and orders twice.
      // Still sent before the uploads finish, because a closed tab must never
      // cost the office an order. The documents follow in their own email.
      after(() =>
        notify(
          `New title order ${row.reference}: ${order.property_address}`,
          officeEmail(
            [
              `Reference: ${row.reference}`,
              `Order id: ${row.id}`,
              declared.length === 0
                ? 'Documents: none attached.'
                : shortfall === 0
                  ? `Documents: ${uploads.length} being uploaded — a second email follows with the links.`
                  : `Documents: the sender chose ${declared.length}, and only ${uploads.length} could be ` +
                    `accepted for upload. Ask them to email the other ${shortfall}.`,
            ],
            order,
          ),
          { replyTo: order.ordered_by_email },
        ),
      );
    }

    return NextResponse.json(
      { ok: true, reference: row.reference, order_id: row.id, uploads },
      { status: duplicate ? 200 : 201 },
    );
  } catch (error) {
    console.error('[api/orders] failed:', (error as Error).message);
    return NextResponse.json(
      {
        error: `We could not record that order. Please email ${site.ordersEmail} or call ${site.phoneDisplay}.`,
      },
      { status: 500 },
    );
  }
}
