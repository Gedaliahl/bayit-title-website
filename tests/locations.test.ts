/**
 * The county fallback, and where it is refused.
 *
 * Without Supabase the site falls back to the six priority counties, so a
 * laptop without credentials still builds. On the production deployment that
 * same fallback would ship six county pages instead of sixty-seven and 404 the
 * rest, and every step of the build would still pass. So a production build,
 * or a CI build with REQUIRE_LOCATIONS=1, has to fail instead — and this is
 * the check that it still does.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FLORIDA_COUNTIES } from '@/lib/florida-counties';
import { aOrAn, countyHasLocalFacts, payerCredit } from '@/lib/locations';

const getServiceClient = vi.fn();

vi.mock('@/lib/supabase', () => ({
  getServiceClient: () => getServiceClient(),
}));

/** Resolves like the PostgREST query in getLocations, whatever it chains. */
function clientReturning(result: { data: unknown; error: { message: string } | null }) {
  const builder: Record<string, unknown> = {
    then(resolve: (value: unknown) => unknown) {
      return Promise.resolve(result).then(resolve);
    },
  };
  for (const method of ['select', 'order']) builder[method] = () => builder;
  return { from: () => builder };
}

function countyRows(count: number) {
  return FLORIDA_COUNTIES.slice(0, count).map((county) => ({
    slug: county.slug,
    kind: 'county',
    name: county.name,
    parent_county_slug: null,
    is_priority: false,
  }));
}

async function loadCounties() {
  vi.resetModules();
  const { getCounties } = await import('@/lib/locations');
  return getCounties();
}

beforeEach(() => {
  getServiceClient.mockReset();
  vi.stubEnv('VERCEL_ENV', '');
  vi.stubEnv('REQUIRE_LOCATIONS', '');
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('a build without Supabase', () => {
  it('falls back to the priority counties, and says so, outside production', async () => {
    getServiceClient.mockReturnValue(null);

    const counties = await loadCounties();

    expect(counties.map((county) => county.slug)).toContain('broward-county');
    expect(counties.length).toBeLessThan(FLORIDA_COUNTIES.length);
    expect(console.warn).toHaveBeenCalledWith(expect.stringMatching(/fallback.*404/));
  });

  it('fails the production build rather than shipping the fallback', async () => {
    getServiceClient.mockReturnValue(null);
    vi.stubEnv('VERCEL_ENV', 'production');

    await expect(loadCounties()).rejects.toThrow(/not configured.*requires all 67 counties/s);
  });

  it('fails a CI build that asks for every county', async () => {
    getServiceClient.mockReturnValue(null);
    vi.stubEnv('REQUIRE_LOCATIONS', '1');

    await expect(loadCounties()).rejects.toThrow(/requires all 67 counties/);
  });

  it('keeps the fallback on a preview deployment', async () => {
    getServiceClient.mockReturnValue(null);
    vi.stubEnv('VERCEL_ENV', 'preview');

    await expect(loadCounties()).resolves.not.toHaveLength(0);
  });
});

describe('a build whose query comes back short', () => {
  it('fails production when the fetch errors', async () => {
    getServiceClient.mockReturnValue(clientReturning({ data: null, error: { message: 'fetch failed' } }));
    vi.stubEnv('VERCEL_ENV', 'production');

    await expect(loadCounties()).rejects.toThrow(/fetch failed/);
  });

  it('fails production when RLS filters every row', async () => {
    getServiceClient.mockReturnValue(clientReturning({ data: [], error: null }));
    vi.stubEnv('VERCEL_ENV', 'production');

    await expect(loadCounties()).rejects.toThrow(/zero rows/);
  });

  it('fails production on a partial table, which would 404 the missing counties', async () => {
    getServiceClient.mockReturnValue(clientReturning({ data: countyRows(66), error: null }));
    vi.stubEnv('VERCEL_ENV', 'production');

    await expect(loadCounties()).rejects.toThrow(/66 of the 67 counties/);
  });

  it('keeps the rows it has outside production, and warns', async () => {
    getServiceClient.mockReturnValue(clientReturning({ data: countyRows(66), error: null }));

    await expect(loadCounties()).resolves.toHaveLength(66);
    expect(console.warn).toHaveBeenCalledWith(expect.stringMatching(/66 of the 67/));
  });

  it('passes production with all sixty-seven', async () => {
    getServiceClient.mockReturnValue(clientReturning({ data: countyRows(67), error: null }));
    vi.stubEnv('VERCEL_ENV', 'production');

    await expect(loadCounties()).resolves.toHaveLength(67);
  });
});

describe('a turnaround set in a blockquote', () => {
  it('drops the marks when every sentence was quoted, so they do not double up', async () => {
    const { turnaroundForQuote } = await import('@/lib/locations');

    expect(
      turnaroundForQuote('"We cannot guarantee same-day recording." "eRecording may take 1-3 days."'),
    ).toBe('We cannot guarantee same-day recording. eRecording may take 1-3 days.');
  });

  it('keeps them where our own words sit between the office’s', async () => {
    const { turnaroundForQuote } = await import('@/lib/locations');
    const mixed = '"We cannot guarantee it." Walk-in recording appears under "Same Day Recording".';

    expect(turnaroundForQuote(mixed)).toBe(mixed);
  });

  it('leaves an unquoted statement alone', async () => {
    const { turnaroundForQuote } = await import('@/lib/locations');

    expect(turnaroundForQuote('Documents are recorded in the order received.')).toBe(
      'Documents are recorded in the order received.',
    );
  });
});

describe('the article before a place name', () => {
  it.each([
    ['Orange County', 'an'],
    ['Orlando', 'an'],
    ['Alachua County', 'an'],
    ['Escambia County', 'an'],
    ['Indian River County', 'an'],
    ['Okeechobee County', 'an'],
    ['Union County', 'a'],
    ['Broward County', 'a'],
    ['Hollywood', 'a'],
    ['Miami-Dade County', 'a'],
  ])('writes %s after "%s"', (name, article) => {
    expect(aOrAn(name)).toBe(article);
  });

  it('is right for every county the site has a page for', () => {
    for (const county of FLORIDA_COUNTIES) {
      const expected = /^(Alachua|Escambia|Indian River|Okaloosa|Okeechobee|Orange|Osceola)/.test(county.name)
        ? 'an'
        : 'a';
      expect(aOrAn(county.name), county.name).toBe(expected);
    }
  });
});

describe('a county page worth indexing', () => {
  const bare = {
    slug: 'liberty-county',
    customaryOwnerPolicyPayer: null,
    customaryOwnerPolicyDetail: null,
    clerkUrl: null,
    recordingTurnaround: null,
  };

  // Thirty-five counties were exactly this on 22 September 2026: the template
  // with a different name in it, which is what a doorway page is.
  it('is not one that says nothing the other counties do not', () => {
    expect(countyHasLocalFacts(bare)).toBe(false);
  });

  it.each([
    ['who customarily pays', { customaryOwnerPolicyPayer: 'seller' }],
    ['why the custom varies', { customaryOwnerPolicyDetail: 'It depends on where in the Keys.' }],
    ['the recording office’s own page', { clerkUrl: 'https://example.gov/recording' }],
    ['the office’s words on turnaround', { recordingTurnaround: '"Same day."' }],
  ])('is one that states %s', (_, fact) => {
    expect(countyHasLocalFacts({ ...bare, ...fact })).toBe(true);
  });

  it('is one with a city page of its own', () => {
    expect(countyHasLocalFacts({ ...bare, slug: 'pinellas-county' })).toBe(true);
  });
});

describe('whose custom a page says it is', () => {
  const none = {
    customaryOwnerPolicyPayer: 'seller',
    customaryOwnerPolicyDetail: null,
    customaryOwnerPolicyPayerSourceName: null,
    customaryOwnerPolicyPayerSourceUrl: null,
    customaryOwnerPolicyPayerCheckedOn: null,
  };

  it('is the publisher it names, with the date it was read', () => {
    expect(
      payerCredit({
        ...none,
        customaryOwnerPolicyPayerSourceName: 'The Fund',
        customaryOwnerPolicyPayerCheckedOn: '2026-09-20',
      }),
    ).toEqual({ kind: 'published', name: 'The Fund', url: null, checkedOn: '2026-09-20' });
  });

  it('is the team’s own where no publisher is named and the team dated it', () => {
    expect(payerCredit({ ...none, customaryOwnerPolicyPayerCheckedOn: '2026-09-24' })).toEqual({
      kind: 'team',
      checkedOn: '2026-09-24',
    });
  });

  it('is not stated for a custom the team set before it kept a date', () => {
    expect(payerCredit(none)).toBeNull();
  });

  it('is not stated where there is no custom to credit', () => {
    expect(
      payerCredit({
        ...none,
        customaryOwnerPolicyPayer: null,
        customaryOwnerPolicyPayerSourceName: 'The Fund',
      }),
    ).toBeNull();
  });

  it('is stated for a custom that varies within the county', () => {
    expect(
      payerCredit({
        ...none,
        customaryOwnerPolicyPayer: null,
        customaryOwnerPolicyDetail: 'It depends on where in the Keys.',
        customaryOwnerPolicyPayerSourceName: 'The Fund',
      }),
    ).toMatchObject({ kind: 'published', name: 'The Fund' });
  });
});
