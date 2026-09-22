// The daily retention run, called by Vercel Cron (see vercel.json).
//
// Vercel sends `Authorization: Bearer <CRON_SECRET>` with every scheduled call.
// Without the secret configured this refuses to run at all: an unauthenticated
// endpoint that deletes documents is not something to leave open by accident.
import { NextResponse } from 'next/server';

import { purgeExpiredDocuments } from '@/lib/document-storage';

export const runtime = 'nodejs';

// Listing every folder in the bucket is one request per folder.
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const report = await purgeExpiredDocuments();
    console.info(
      `[cron/purge] deleted ${report.quotePages} contract page(s), ${report.orderDocuments} order document(s), ` +
        `${report.abandonedUploads} abandoned upload(s).`,
    );
    // A part that failed is a 500, so Vercel's cron log shows the day it did
    // not all happen, even though the other parts did.
    const ok = report.failed.length === 0;
    return NextResponse.json(
      { ok, ...report },
      { status: ok ? 200 : 500, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('[cron/purge] failed:', (error as Error).message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
