// Shared plumbing for the public form endpoints: what a request must look like
// to be heard at all, caller fingerprinting, the bot check, a database-backed
// rate limit, recording a submission once, and the notification email.
import 'server-only';

import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from './database.types';
import { requireServiceClient } from './supabase';
import { site } from './site';

/**
 * Refuses anything that is not our own page posting JSON.
 *
 * A browser will send `text/plain` to any origin without asking first — no
 * CORS preflight — and the handlers used to parse such a body as JSON anyway,
 * so any page on the internet could submit an order in a visitor's name. A
 * cross-site `application/json` post does need a preflight, which this site
 * never answers, so insisting on the content type closes that door by itself.
 *
 * The Origin and Sec-Fetch-Site checks are the second lock. Both headers are
 * refused only when present and wrong. When they are absent the request is
 * not from a modern browser — every current browser sends them on a POST like
 * this — and a script calling the endpoint directly can set any header it
 * likes, so demanding them would stop nobody except honest tools. Scripts are
 * what the bot check and the rate limit are for.
 */
export function refuseForeignRequest(request: Request): NextResponse | null {
  const type = request.headers.get('content-type') ?? '';
  if (!/^application\/json\s*(;|$)/i.test(type)) {
    return NextResponse.json({ error: 'Expected JSON.' }, { status: 415 });
  }

  const fetchSite = request.headers.get('sec-fetch-site');
  const origin = request.headers.get('origin');
  if ((fetchSite && fetchSite !== 'same-origin') || (origin && !isOwnOrigin(origin, request))) {
    return NextResponse.json({ error: 'Send this from the form on our site.' }, { status: 403 });
  }

  return null;
}

function isOwnOrigin(origin: string, request: Request): boolean {
  const host =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? new URL(request.url).host;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * A one-way fingerprint of the caller.
 *
 * The raw IP is never stored. It is salted with the service-role key — a value
 * that already exists, is already secret, and rotates when credentials rotate —
 * so the stored hash is not reversible by dictionary attack over the IPv4 space.
 */
export function hashIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip');
  if (!ip) return null;

  // Falsy check, not `??`: an empty env var would otherwise become an empty salt.
  const salt = process.env.SUPABASE_SERVICE_ROLE_KEY || 'unsalted';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
}

/**
 * Whether Cloudflare Turnstile is switched on. It takes both keys: the site
 * key puts the widget on the page, the secret checks what it hands back, and
 * enforcing one without the other would refuse every real submission.
 */
export function botCheckEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY);
}

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Asks Cloudflare whether the token the widget produced is genuine.
 *
 * A token Cloudflare looks at and rejects is refused. Cloudflare being
 * unreachable is not the sender's fault, and refusing on it would turn an
 * outage somewhere else into lost orders here, so that case is let through and
 * logged — the rate limit still stands behind it.
 *
 * A secret Cloudflare does not recognize is let through as well, for the same
 * reason: refusing would stop every order until someone noticed. But it is
 * named as what it is, not as an outage, and /api/health fails on it, because
 * it means the check is off for everyone.
 */
export async function passesBotCheck(token: string | undefined): Promise<boolean> {
  if (!botCheckEnabled()) return true;
  if (!token) return false;

  try {
    const result = await siteverify(token);
    if (result.secretRefused) {
      console.error('[bot-check] Cloudflare refused TURNSTILE_SECRET_KEY; the bot check is off until it is fixed.');
      return true;
    }
    return result.success;
  } catch (error) {
    console.error('[bot-check] could not verify, allowing through:', (error as Error).message);
    return true;
  }
}

/** Cloudflare's own codes for a missing or wrong secret, which it answers with a 400. */
const SECRET_ERRORS = new Set(['missing-input-secret', 'invalid-input-secret']);

/** One siteverify call. Throws only when Cloudflare did not answer. */
export async function siteverify(token: string): Promise<{ success: boolean; secretRefused: boolean }> {
  const response = await fetch(SITEVERIFY_URL, {
    method: 'POST',
    body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY ?? '', response: token }),
    signal: AbortSignal.timeout(5000),
  });
  if (response.status >= 500 || response.status === 429) throw new Error(`siteverify answered ${response.status}`);
  const result = (await response.json().catch(() => ({}))) as { success?: boolean; 'error-codes'?: string[] };
  return {
    success: result.success === true,
    secretRefused: (result['error-codes'] ?? []).some((code) => SECRET_ERRORS.has(code)),
  };
}

/** What the bot check says to a person it has turned away. */
export const BOT_CHECK_FAILED = `The check above the button did not go through. Try it again, or call ${site.phoneDisplay}.`;

/**
 * Separate hourly allowances, so one kind of submission cannot use up
 * another's. A contract sent from /estimate is a lead too, and when the two
 * shared a count, pricing a contract left the sender unable to use the contact
 * form for an hour. Spam gets a count of its own so the trap cannot be used to
 * fill the table.
 */
export type RateScope = 'orders' | 'leads' | 'quotes' | 'spam';

/**
 * Caps submissions per fingerprint per hour. Counted in the database rather than
 * in memory, because serverless instances do not share memory and an in-process
 * counter would reset on every cold start.
 */
export async function isRateLimited(
  scope: RateScope,
  ipHash: string | null,
  limit: number,
): Promise<boolean> {
  if (!ipHash) return false;

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const supabase = requireServiceClient();

  const leads = () =>
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', since);

  const { count, error } = await (scope === 'orders'
    ? supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('ip_hash', ipHash)
        .gte('created_at', since)
    : scope === 'spam'
      ? leads().eq('status', 'spam')
      : scope === 'quotes'
        ? leads().eq('source', 'calculator').neq('status', 'spam')
        : leads().neq('source', 'calculator').neq('status', 'spam'));

  if (error) {
    // Open, on purpose. The limiter is one query against the same database
    // the submission is about to be written to; if it cannot answer, the
    // write is the likelier thing to fail next, and when it does not, a real
    // order is worth more than an hour's flood protection. Logged as an error
    // so that a limiter which has quietly stopped working shows up.
    console.error(`[rate-limit] check failed, allowing through: ${error.message}`);
    return false;
  }

  return (count ?? 0) >= limit;
}

interface DbError {
  code?: string;
  message: string;
}

/**
 * Whether the `submission_id` column is there. Assumed until the database says
 * otherwise: the migration that adds it
 * (supabase/migrations/20260922000200_submission_ids.sql) may not have been
 * applied yet, and until it is, a submission must still go through — it simply
 * cannot be de-duplicated. The answer is asked again after a while, so a warm
 * instance starts de-duplicating once the migration lands rather than at its
 * next cold start.
 */
const RECHECK_COLUMN_MS = 10 * 60_000;
let submissionColumnMissingAt: number | null = null;

function hasSubmissionColumn(): boolean {
  return submissionColumnMissingAt === null || Date.now() - submissionColumnMissingAt > RECHECK_COLUMN_MS;
}

function noteMissingColumn(): void {
  submissionColumnMissingAt = Date.now();
}

/** PostgREST's "no such column in the payload", and Postgres's "no such column". */
function isMissingColumn(error: DbError): boolean {
  return error.code === 'PGRST204' || error.code === '42703';
}

type SubmissionTable = 'leads' | 'orders';
type InsertRow<T extends SubmissionTable> = Database['public']['Tables'][T]['Insert'];

/**
 * Writes a submission exactly once per `submission_id`.
 *
 * A slow answer is the ordinary cause of a duplicate: the row is written, the
 * response never arrives, and the sender presses the button again. The browser
 * sends the same id with the retry, and this finds the first row rather than
 * writing a second. The unique index settles the race where two copies arrive
 * together; the loser reads back the winner.
 *
 * `buildRow` is called afresh on each attempt, so a caller that mints a
 * reference inside it gets a new one when a reference collides.
 *
 * `admit` is asked only for a submission that is not already on file, and a
 * false answer returns null without writing anything. It is where the hourly
 * limit goes: a retry of an order that was recorded must find that order, not
 * be told there have been too many orders.
 */
export async function recordOnce<Row, T extends SubmissionTable = SubmissionTable>(
  table: T,
  columns: string,
  submissionId: string | undefined,
  buildRow: () => InsertRow<T>,
  admit: () => Promise<boolean> = async () => true,
): Promise<{ row: Row; duplicate: boolean } | null> {
  // Untyped on purpose, and only here: supabase-js cannot follow a table name
  // that is itself a type parameter, so a query shared by leads and orders
  // does not type-check against the generated types. The rows are still
  // checked against their table, by `buildRow`'s return type.
  const db = requireServiceClient() as unknown as SupabaseClient;
  const lookup = (id: string) =>
    db.from(table).select(columns).eq('submission_id', id).maybeSingle<Row>();

  if (submissionId && hasSubmissionColumn()) {
    const { data, error } = await lookup(submissionId);
    if (data) return { row: data, duplicate: true };
    if (error && isMissingColumn(error)) noteMissingColumn();
  }

  if (!(await admit())) return null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const keyed = Boolean(submissionId) && hasSubmissionColumn();
    const { data, error } = await db
      .from(table)
      .insert({ ...buildRow(), ...(keyed ? { submission_id: submissionId } : {}) })
      .select(columns)
      .single<Row>();

    if (!error && data) return { row: data, duplicate: false };
    if (!error) throw new Error('the insert returned no row');

    if (keyed && isMissingColumn(error)) {
      noteMissingColumn();
      continue;
    }

    if (error.code === '23505') {
      if (keyed && error.message.includes('submission_id')) {
        const { data: first } = await lookup(submissionId!);
        if (first) return { row: first, duplicate: true };
      }
      // Otherwise a generated reference collided; the next attempt mints another.
      continue;
    }

    throw new Error(error.message);
  }

  throw new Error('could not record the submission after three attempts');
}

/** More than this from one fingerprint in an hour is not worth keeping. */
const SPAM_HOURLY_LIMIT = 20;

/**
 * Keeps a submission that tripped the honeypot, marked as spam, instead of
 * throwing it away.
 *
 * The trap is not infallible — autofill filled the old one on real orders —
 * and a discarded submission leaves nothing for anyone to find. Kept as a lead
 * with status 'spam', it is out of the office's way and still there if a
 * sender calls to ask where their order went. It is always a lead, even when
 * it came from the order form: `orders` has no spam status, and a spam row
 * there would take an order reference and sit in the office's working list.
 *
 * No email is sent, and nothing here can fail the request: the bot is
 * answered "received" whatever happens.
 */
export async function fileAsSpam(
  row: Omit<Database['public']['Tables']['leads']['Insert'], 'status' | 'ip_hash'>,
  ipHash: string | null,
): Promise<void> {
  try {
    if (await isRateLimited('spam', ipHash, SPAM_HOURLY_LIMIT)) return;
    const { error } = await requireServiceClient()
      .from('leads')
      .insert({ ...row, status: 'spam', ip_hash: ipHash });
    if (error) console.error(`[spam] could not keep a trapped submission: ${error.message}`);
  } catch (error) {
    console.error('[spam] could not keep a trapped submission:', (error as Error).message);
  }
}

/**
 * Notifies the office. Best effort by design: the submission is already
 * persisted before this runs, so a mail outage loses a notification, never a lead.
 *
 * `replyTo` is the submitter's address, already validated as an email, so the
 * office's Reply goes to the person and not to the website's own sender.
 */
export async function notify(
  subject: string,
  lines: string[],
  options: { replyTo?: string } = {},
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // The subject is left out of the log: it carries the sender's name or the
    // property address, and a log line is not the place for either.
    if (process.env.VERCEL_ENV === 'production') {
      console.error('[notify] RESEND_API_KEY is not set in production — the office was not told about a submission.');
    } else {
      console.info('[notify] RESEND_API_KEY unset; skipping the office email.');
    }
    return;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.NOTIFY_FROM_EMAIL || 'website@bayittitle.com',
        to: [site.ordersEmail],
        subject: singleLine(subject),
        text: lines.join('\n'),
        ...(options.replyTo ? { reply_to: options.replyTo } : {}),
      }),
      // A hung mail call used to hold the response open until the platform
      // killed it, and the sender, seeing an error, sent the order again.
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      console.error(`[notify] send failed (${response.status}): ${await response.text()}`);
    }
  } catch (error) {
    console.error('[notify] send threw:', (error as Error).message);
  }
}

/**
 * A subject is one line. Form text reaches it — a name, an address — and a
 * line break there is how extra headers or a forged body get into an email.
 */
export function singleLine(text: string): string {
  return text.replace(/[\r\n]+/g, ' ').trim();
}

/**
 * The office's email: our own lines first, then what the sender typed, set
 * apart and quoted.
 *
 * The order matters. When the sender's text came first, a note reading
 * "Reference: …" or "Wire instructions have changed" sat in the same voice as
 * the lines the website writes, and a busy reader could not tell them apart.
 * On a title agency's inbox that is the opening a wire fraud needs.
 */
export function officeEmail(system: string[], submitted: Record<string, unknown>): string[] {
  return [
    ...system,
    '',
    'What the sender typed, as they typed it. Their words, not ours — verify anything before acting on it:',
    '',
    ...describeSubmission(submitted),
  ];
}

/** Renders a validated payload as quoted plain text, one field per line. */
export function describeSubmission(payload: Record<string, unknown>): string[] {
  return Object.entries(payload)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${String(value)}`.replace(/^/gm, '> '));
}
