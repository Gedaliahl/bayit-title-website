// Service-role Supabase client. Server-only: this module throws at import time
// if it is ever pulled into a client bundle.
import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from './database.types';

// The website project. There is a second Supabase project named "Bayit" which
// is the live title production system — transactions, escrow, banking details.
// The website must never connect to it. That separation is deliberate, so it is
// enforced here rather than left to configuration discipline.
const WEBSITE_PROJECT_REF = 'ajauxndpqllrsfivvurj';
const PRODUCTION_PROJECT_REF = 'rsdhvyutynygzgtzzljd';

function assertWebsiteProject(url: string): void {
  if (url.includes(PRODUCTION_PROJECT_REF)) {
    throw new Error(
      'Refusing to connect: SUPABASE_URL points at the Bayit production system, ' +
        'not the website project. The website must never reach production data.',
    );
  }
  if (!url.includes(WEBSITE_PROJECT_REF)) {
    // A local stack or a preview branch is legitimate; a stray production-adjacent
    // project is not. Warn loudly rather than fail, so local dev still works.
    console.warn(
      `[supabase] SUPABASE_URL is not the expected website project (${WEBSITE_PROJECT_REF}). ` +
        'Confirm this is intentional.',
    );
  }
}

export type Db = SupabaseClient<Database>;

let client: Db | null = null;

/**
 * Returns the service-role client, or null when credentials are absent.
 *
 * Null is a supported state, not an error. Reviews and locations fail soft at
 * build time so the site still renders without Supabase configured; only the
 * form Route Handlers treat a null client as a hard failure.
 */
export function getServiceClient(): Db | null {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  assertWebsiteProject(url);

  client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-application-name': 'bayittitle.com' } },
  });
  return client;
}

/** Same client, but throws when unconfigured. For write paths that must not silently no-op. */
export function requireServiceClient(): Db {
  const supabase = getServiceClient();
  if (!supabase) {
    throw new Error('Supabase is not configured: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  }
  return supabase;
}
