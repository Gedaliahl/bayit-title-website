// For an uptime monitor: whether the three things a submission depends on are
// configured and answering. A form that renders but cannot store an order, or
// stores it without anyone being told, looks exactly like a working site from
// the outside, which is why this exists.
//
// It says only yes or no. No key, no URL, no row and no count ever appears in
// the answer, because anyone can call it.
import { NextResponse } from 'next/server';

import { getServiceClient } from '@/lib/supabase';
import { BUCKET } from '@/lib/documents';

export const runtime = 'nodejs';

interface Check {
  configured: boolean;
  reachable: boolean;
}

interface Health {
  ok: boolean;
  checks: Record<'supabase' | 'bucket' | 'resend', Check>;
}

/**
 * How long one answer stands. Anyone can call this, and every uncached call
 * spends a request against Resend's per-second limit — the same limit the
 * office's order emails are sent under. A monitor polls once a minute at most,
 * so it never sees the difference.
 */
const CACHE_MS = 60_000;
const CHECK_TIMEOUT_MS = 5000;

let cached: { at: number; health: Health } | null = null;

/** The storage client takes no abort signal, so the deadline is raced instead. Null is a timeout. */
function withDeadline<T>(work: Promise<T>): Promise<T | null> {
  return Promise.race([
    work,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), CHECK_TIMEOUT_MS)),
  ]);
}

async function supabaseCheck(): Promise<{ database: Check; bucket: Check }> {
  const supabase = getServiceClient();
  if (!supabase) {
    return {
      database: { configured: false, reachable: false },
      bucket: { configured: false, reachable: false },
    };
  }

  const [database, bucket] = await Promise.all([
    supabase
      .from('locations')
      .select('id', { head: true, count: 'exact' })
      .limit(1)
      .abortSignal(AbortSignal.timeout(CHECK_TIMEOUT_MS)),
    withDeadline(supabase.storage.getBucket(BUCKET)),
  ]);

  return {
    database: { configured: true, reachable: !database.error },
    // A bucket that has gone public would still "answer"; it is not healthy.
    bucket: {
      configured: true,
      reachable: bucket !== null && !bucket.error && bucket.data?.public === false,
    },
  };
}

async function resendCheck(): Promise<Check> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { configured: false, reachable: false };

  try {
    const response = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    });
    // A key scoped to sending only is refused here by name, which still proves
    // Resend knows the key — and sending-only is the scope it should have.
    if (response.ok) return { configured: true, reachable: true };
    const body = (await response.json().catch(() => null)) as { name?: string } | null;
    return { configured: true, reachable: body?.name === 'restricted_api_key' };
  } catch {
    return { configured: true, reachable: false };
  }
}

async function check(): Promise<Health> {
  const [{ database, bucket }, resend] = await Promise.all([supabaseCheck(), resendCheck()]);
  const checks = { supabase: database, bucket, resend };
  const ok = Object.values(checks).every((entry) => entry.configured && entry.reachable);
  return { ok, checks };
}

export async function GET() {
  if (!cached || Date.now() - cached.at > CACHE_MS) {
    cached = { at: Date.now(), health: await check() };
  }
  const { health } = cached;

  return NextResponse.json(health, {
    status: health.ok ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
