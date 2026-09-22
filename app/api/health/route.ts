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
      .abortSignal(AbortSignal.timeout(5000)),
    supabase.storage.getBucket(BUCKET),
  ]);

  return {
    database: { configured: true, reachable: !database.error },
    // A bucket that has gone public would still "answer"; it is not healthy.
    bucket: { configured: true, reachable: !bucket.error && bucket.data?.public === false },
  };
}

async function resendCheck(): Promise<Check> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { configured: false, reachable: false };

  try {
    const response = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
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

export async function GET() {
  const [{ database, bucket }, resend] = await Promise.all([supabaseCheck(), resendCheck()]);
  const checks = { supabase: database, bucket, resend };
  const ok = Object.values(checks).every((check) => check.configured && check.reachable);

  return NextResponse.json(
    { ok, checks },
    { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
