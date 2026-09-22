import { after, NextResponse } from 'next/server';

import { HONEYPOT_FIELD, leadSchema, fieldErrors } from '@/lib/schemas';
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
import { site } from '@/lib/site';

export const runtime = 'nodejs';

const HOURLY_LIMIT = 5;

export async function POST(request: Request) {
  const refused = refuseForeignRequest(request);
  if (refused) return refused;

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

  const {
    [HONEYPOT_FIELD]: trap,
    turnstile_token: botToken,
    submission_id: submissionId,
    ...lead
  } = parsed.data;

  if (!(await passesBotCheck(botToken))) {
    return NextResponse.json({ error: BOT_CHECK_FAILED }, { status: 403 });
  }

  const ipHash = hashIp(request);

  // Honeypot tripped. Kept as spam, answered as though it succeeded so the bot
  // stops retrying, and the office is not emailed.
  if (trap) {
    await fileAsSpam(lead, ipHash);
    return NextResponse.json({ ok: true });
  }

  try {
    const recorded = await recordOnce<{ id: string }, 'leads'>(
      'leads',
      'id',
      submissionId,
      () => ({ ...lead, ip_hash: ipHash }),
      async () => !(await isRateLimited('leads', ipHash, HOURLY_LIMIT)),
    );
    if (!recorded) {
      return NextResponse.json(
        { error: `That is more requests than we can take in an hour. Call ${site.phoneDisplay}.` },
        { status: 429 },
      );
    }
    const { row, duplicate } = recorded;

    // Persisted first, then notified after the response: a mail failure must
    // not lose the lead, and a slow one must not make the sender send it twice.
    if (!duplicate) {
      after(() =>
        notify(
          `Website ${lead.source}: ${lead.full_name}`,
          officeEmail([`Lead id: ${row.id}`], lead),
          { replyTo: lead.email },
        ),
      );
    }

    return NextResponse.json({ ok: true, id: row.id }, { status: duplicate ? 200 : 201 });
  } catch (error) {
    console.error('[api/leads] failed:', (error as Error).message);
    return NextResponse.json(
      {
        error: `We could not record that. Please email ${site.email} or call ${site.phoneDisplay}.`,
      },
      { status: 500 },
    );
  }
}
