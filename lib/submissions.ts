// Shared plumbing for the public form endpoints: caller fingerprinting, a
// database-backed rate limit, and the notification email.
import 'server-only';

import { createHash } from 'node:crypto';
import { requireServiceClient } from './supabase';
import { site } from './site';

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
 * Caps submissions per fingerprint per hour. Counted in the database rather than
 * in memory, because serverless instances do not share memory and an in-process
 * counter would reset on every cold start.
 */
export async function isRateLimited(
  table: 'leads' | 'orders',
  ipHash: string | null,
  limit: number,
): Promise<boolean> {
  if (!ipHash) return false;

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const supabase = requireServiceClient();

  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', since);

  if (error) {
    // Never block a real submission because the limiter itself failed.
    console.warn(`[rate-limit] check failed, allowing through: ${error.message}`);
    return false;
  }

  return (count ?? 0) >= limit;
}

/**
 * Notifies the office. Best effort by design: the submission is already
 * persisted before this runs, so a mail outage loses a notification, never a lead.
 */
export async function notify(subject: string, lines: string[]): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info(`[notify] RESEND_API_KEY unset; skipping email for: ${subject}`);
    return;
  }

  const body = lines.join('\n');

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
        subject,
        text: body,
      }),
    });

    if (!response.ok) {
      console.error(`[notify] send failed (${response.status}): ${await response.text()}`);
    }
  } catch (error) {
    console.error('[notify] send threw:', error);
  }
}

/** Renders a validated payload as the plain-text body of a notification email. */
export function describeSubmission(payload: Record<string, unknown>): string[] {
  return Object.entries(payload)
    .filter(([key, value]) => key !== 'company' && value !== undefined && value !== '')
    .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${String(value)}`);
}
