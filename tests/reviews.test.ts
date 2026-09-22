/**
 * The two review rules that live in lib/reviews.ts rather than in the UI.
 *
 * Forty of the ninety-two rows have dates derived from "12 weeks ago" labels,
 * two of which contradict their own owner-reply dates, so those rows print no
 * date at all. Rows whose body Google truncated are withheld entirely, because
 * a body cut off at "View full review" would be quoted out of context. Both are
 * decisions about what the firm is willing to publish, so neither may drift
 * into being a template detail.
 */
import fs from 'node:fs';
import path from 'node:path';

import matter from 'gray-matter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface Call {
  method: string;
  args: unknown[];
}

/** Records the query that was built, then resolves like a PostgREST call. */
function fakeClient(result: { data: unknown; error: { message: string } | null }) {
  const calls: Call[] = [];

  const builder: Record<string, unknown> = {
    then(resolve: (value: unknown) => unknown) {
      return Promise.resolve(result).then(resolve);
    },
    maybeSingle() {
      calls.push({ method: 'maybeSingle', args: [] });
      return Promise.resolve(result);
    },
  };

  for (const method of ['select', 'eq', 'not', 'order', 'limit']) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    };
  }

  return {
    calls,
    client: {
      from(table: string) {
        calls.push({ method: 'from', args: [table] });
        return builder;
      },
    },
  };
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'r1',
    author_name: 'A. Reviewer',
    rating: 5,
    body: 'They caught an open permit before closing.',
    published_at: '2026-03-01',
    reply_body: null,
    topic_tags: ['permits'],
    team_member_slug: 'shevy',
    county_slug: 'broward-county',
    is_featured: false,
    date_is_approximate: false,
    body_truncated: false,
    ...overrides,
  };
}

const getServiceClient = vi.fn();

vi.mock('@/lib/supabase', () => ({
  getServiceClient: () => getServiceClient(),
  requireServiceClient: () => getServiceClient(),
}));

beforeEach(() => {
  vi.resetModules();
  getServiceClient.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('dates that cannot be trusted', () => {
  it('prints no date for a row whose date was approximated', async () => {
    const { client } = fakeClient({
      data: [row({ id: 'approx', date_is_approximate: true, published_at: '2026-01-15' })],
      error: null,
    });
    getServiceClient.mockReturnValue(client);

    const { getReviews } = await import('@/lib/reviews');
    const [review] = await getReviews();

    expect(review.id).toBe('approx');
    // The stored value exists; publishing it would be a guess.
    expect(review.publishedAt).toBeNull();
  });

  it('keeps the date on a row that was dated properly', async () => {
    const { client } = fakeClient({ data: [row({ published_at: '2026-03-01' })], error: null });
    getServiceClient.mockReturnValue(client);

    const { getReviews } = await import('@/lib/reviews');
    const [review] = await getReviews();

    expect(review.publishedAt).toBe('2026-03-01');
  });
});

describe('bodies Google cut off', () => {
  it('asks the database to withhold truncated and hidden rows', async () => {
    const { client, calls } = fakeClient({ data: [], error: null });
    getServiceClient.mockReturnValue(client);

    const { getReviews } = await import('@/lib/reviews');
    await getReviews();

    const filters = calls.filter((call) => call.method === 'eq').map((call) => call.args);
    expect(filters).toContainEqual(['body_truncated', false]);
    expect(filters).toContainEqual(['is_hidden', false]);
    // A review with no text at all has nothing to quote either.
    expect(calls).toContainEqual({ method: 'not', args: ['body', 'is', null] });
  });
});

describe('failing soft', () => {
  it('renders without reviews when Supabase is not configured', async () => {
    getServiceClient.mockReturnValue(null);

    const { getReviews, getReviewSnapshot } = await import('@/lib/reviews');

    await expect(getReviews()).resolves.toEqual([]);
    await expect(getReviewSnapshot()).resolves.toBeNull();
  });

  it('renders without reviews when the query fails, rather than failing the build', async () => {
    const { client } = fakeClient({ data: null, error: { message: 'connection reset' } });
    getServiceClient.mockReturnValue(client);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { getReviews } = await import('@/lib/reviews');

    await expect(getReviews()).resolves.toEqual([]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('connection reset'));
  });
});

describe('pulling a relevant review onto a page', () => {
  it('ranks by how many tags overlap, most specific first', async () => {
    const { client } = fakeClient({
      data: [
        row({ id: 'one-tag', topic_tags: ['permits'] }),
        row({ id: 'two-tags', topic_tags: ['permits', 'hoa'] }),
        row({ id: 'no-overlap', topic_tags: ['wire'] }),
      ],
      error: null,
    });
    getServiceClient.mockReturnValue(client);

    const { getReviewsByTags } = await import('@/lib/reviews');
    const matched = await getReviewsByTags(['permits', 'hoa']);

    expect(matched.map((review) => review.id)).toEqual(['two-tags', 'one-tag']);
  });

  it('only ever asks for a tag the reviews actually carry', async () => {
    const { REVIEW_TOPIC_TAGS } = await import('@/lib/reviews');
    const known = new Set<string>(REVIEW_TOPIC_TAGS);

    // Matching is by exact string. Four pages once asked for `clearing-title`
    // and `ron` where the rows say `title-clearing` and `remote-closing`, and
    // showed no review with nothing to say why.
    const unknown = ['title-problems', 'services'].flatMap((collection) => {
      const dir = path.join(process.cwd(), 'content', collection);
      return fs
        .readdirSync(dir)
        .filter((file) => file.endsWith('.md'))
        .flatMap((file) => {
          const tags = (matter(fs.readFileSync(path.join(dir, file), 'utf8')).data.review_tags ??
            []) as string[];
          return tags.filter((tag) => !known.has(tag)).map((tag) => `${collection}/${file}: ${tag}`);
        });
    });

    expect(unknown).toEqual([]);
  });

  it('returns nothing when the page declares no tags', async () => {
    getServiceClient.mockReturnValue(null);
    const { getReviewsByTags } = await import('@/lib/reviews');

    expect(await getReviewsByTags([])).toEqual([]);
    // No tags means no query at all.
    expect(getServiceClient).not.toHaveBeenCalled();
  });

  it('honours the limit it is given', async () => {
    const { client } = fakeClient({
      data: [row({ id: 'a' }), row({ id: 'b' }), row({ id: 'c' })],
      error: null,
    });
    getServiceClient.mockReturnValue(client);

    const { getReviewsByTags } = await import('@/lib/reviews');
    expect(await getReviewsByTags(['permits'], 1)).toHaveLength(1);
  });
});

describe('the reviews the homepage rotates through', () => {
  const long = (length: number) => 'x'.repeat(length);

  it('takes the office’s featured picks first, up to the limit', async () => {
    const { client } = fakeClient({
      data: [
        row({ id: 'plain-a', is_featured: false, published_at: '2026-04-01' }),
        row({ id: 'featured', is_featured: true, published_at: '2020-01-01' }),
        row({ id: 'plain-b', is_featured: false, published_at: '2026-03-01' }),
      ],
      error: null,
    });
    getServiceClient.mockReturnValue(client);

    const { getBestReviews } = await import('@/lib/reviews');

    // Featured ahead of a newer review, then the rest of the site's own order.
    expect((await getBestReviews()).map((review) => review.id)).toEqual([
      'featured',
      'plain-a',
      'plain-b',
    ]);
    expect(await getBestReviews({ limit: 1 })).toHaveLength(1);
  });

  it('holds a review too long for the space behind the ones that fit', async () => {
    const { client } = fakeClient({
      data: [
        row({ id: 'long', body: long(300) }),
        row({ id: 'short', body: long(100) }),
      ],
      error: null,
    });
    getServiceClient.mockReturnValue(client);

    const { getBestReviews } = await import('@/lib/reviews');
    const picked = await getBestReviews({ maxBodyLength: 240 });

    // Relevance puts the longer review first; the strip cannot hold it, so it
    // goes behind the one that fits — and is still offered rather than dropped,
    // because a short rotation is worse than a quote that runs long.
    expect(picked.map((review) => review.id)).toEqual(['short', 'long']);
    expect(await getBestReviews({ limit: 1, maxBodyLength: 240 })).toHaveLength(1);
  });
});
