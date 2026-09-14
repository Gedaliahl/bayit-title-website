// County and city data. Read at build time with the service role; falls back to
// the canonical priority counties in lib/site.ts when Supabase is unconfigured.
import 'server-only';

import { cache } from 'react';
import { getServiceClient } from './supabase';
import { site } from './site';

export interface Location {
  slug: string;
  kind: 'county' | 'city';
  name: string;
  parentCountySlug: string | null;
  isPriority: boolean;
  clerkName: string | null;
  clerkUrl: string | null;
  propertyAppraiserUrl: string | null;
  taxCollectorUrl: string | null;
  /** Who customarily pays for the owner's policy. Null until verified. */
  customaryOwnerPolicyPayer: string | null;
  eRecordingAvailable: boolean | null;
  /**
   * What this county's recording office publishes about how long recording
   * takes, in its own words. Null where the office publishes nothing — which is
   * 42 of the 67 counties. Never fill this from an industry average or a
   * recorder-directory site; see docs/county-recording-turnaround.md.
   */
  recordingTurnaround: string | null;
  recordingTurnaroundSourceUrl: string | null;
  recordingTurnaroundCheckedOn: string | null;
  notes: string | null;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Used when Supabase is unavailable so county links never 404 at build time. */
function fallbackCounties(): Location[] {
  return site.priorityCounties.map((name) => ({
    slug: slugify(name),
    kind: 'county' as const,
    name,
    parentCountySlug: null,
    isPriority: true,
    clerkName: null,
    clerkUrl: null,
    propertyAppraiserUrl: null,
    taxCollectorUrl: null,
    customaryOwnerPolicyPayer: null,
    eRecordingAvailable: null,
    recordingTurnaround: null,
    recordingTurnaroundSourceUrl: null,
    recordingTurnaroundCheckedOn: null,
    notes: null,
  }));
}

export const getLocations = cache(async (): Promise<Location[]> => {
  const supabase = getServiceClient();
  if (!supabase) return fallbackCounties();

  const { data, error } = await supabase
    .from('locations')
    // Single string literal on purpose — see the note in lib/reviews.ts.
    .select(
      'slug, kind, name, parent_county_slug, is_priority, clerk_name, clerk_url, property_appraiser_url, tax_collector_url, customary_owner_policy_payer, e_recording_available, recording_turnaround, recording_turnaround_source_url, recording_turnaround_checked_on, notes',
    )
    .order('is_priority', { ascending: false })
    .order('name');

  if (error || !data) {
    if (error) console.warn(`[locations] fetch failed, using canonical fallback: ${error.message}`);
    return fallbackCounties();
  }

  // An empty array is truthy, so it would otherwise sail past the check above
  // and return no counties at all — generateStaticParams would emit no routes
  // and every county URL would 404. The table is seeded, so empty means the
  // rows were filtered out rather than absent: almost always the anon key in
  // place of the service role key, where RLS returns zero rows and no error.
  if (data.length === 0) {
    console.warn(
      '[locations] query returned zero rows, using canonical fallback. The table is seeded, ' +
        'so this usually means SUPABASE_SERVICE_ROLE_KEY holds the anon key: RLS then filters ' +
        'every row and reports no error.',
    );
    return fallbackCounties();
  }

  return data.map((row) => ({
    slug: row.slug,
    kind: row.kind,
    name: row.name,
    parentCountySlug: row.parent_county_slug,
    isPriority: row.is_priority,
    clerkName: row.clerk_name,
    clerkUrl: row.clerk_url,
    propertyAppraiserUrl: row.property_appraiser_url,
    taxCollectorUrl: row.tax_collector_url,
    customaryOwnerPolicyPayer: row.customary_owner_policy_payer,
    eRecordingAvailable: row.e_recording_available,
    recordingTurnaround: row.recording_turnaround,
    recordingTurnaroundSourceUrl: row.recording_turnaround_source_url,
    recordingTurnaroundCheckedOn: row.recording_turnaround_checked_on,
    notes: row.notes,
  }));
});

export async function getCounties(): Promise<Location[]> {
  return (await getLocations()).filter((location) => location.kind === 'county');
}

export async function getLocation(slug: string): Promise<Location | null> {
  return (await getLocations()).find((location) => location.slug === slug) ?? null;
}
