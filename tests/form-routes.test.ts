/**
 * The three submission endpoints, driven the way the browser drives them, with
 * the database replaced by a recorder.
 *
 * These exist because of a failure no unit test caught: an untouched County
 * select posted '', the schema passed it through, and the foreign key on
 * locations(slug) refused the insert — so every order sent with County left on
 * "Select…" was a 500, and not one web submission ever landed. What matters is
 * the row that reaches the database, so that is what these assert.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase, type Query, type Responder } from './stubs/supabase-fake';

const state = vi.hoisted(() => ({
  client: null as unknown,
  deferred: [] as (() => unknown)[],
}));

vi.mock('@/lib/supabase', () => ({
  requireServiceClient: () => state.client,
  getServiceClient: () => state.client,
}));

vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: (task: () => unknown) => {
    state.deferred.push(task);
  },
}));

const ORDER_ID = '11111111-1111-4111-8111-111111111111';
const SUBMISSION_ID = '22222222-2222-4222-8222-222222222222';

function post(path: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`https://www.bayittitle.com${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      host: 'www.bayittitle.com',
      origin: 'https://www.bayittitle.com',
      'sec-fetch-site': 'same-origin',
      'x-forwarded-for': '203.0.113.9',
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const order = {
  ordered_by_name: 'Jane Agent',
  ordered_by_email: 'jane@example.com',
  property_address: '123 Main St, Coral Springs FL 33065',
};

/** Answers the way the live tables do when nothing is wrong. */
const healthy: Responder = (query) => {
  if (query.head) return { count: 0 };
  if (query.op === 'insert' && query.table === 'orders') {
    return { data: { id: ORDER_ID, reference: query.payload?.reference } };
  }
  if (query.op === 'insert') return { data: { id: ORDER_ID } };
  return { data: null };
};

let recorded: Query[];

async function load(respond: Responder = healthy) {
  vi.resetModules();
  const fake = fakeSupabase(respond);
  state.client = fake.client;
  state.deferred = [];
  recorded = fake.queries;
  return fake;
}

const inserts = () => recorded.filter((query) => query.op === 'insert');

beforeEach(() => {
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'salt');
  vi.stubEnv('RESEND_API_KEY', '');
  vi.spyOn(console, 'info').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('an order with the optional fields left alone', () => {
  it('reaches the database with nulls, never empty strings', async () => {
    await load();
    const { POST } = await import('@/app/api/orders/route');

    const response = await POST(
      post('/api/orders', {
        ...order,
        county_slug: '',
        parcel_id: '',
        transaction_type: '',
        closing_date_target: '',
        closing_method: '',
        purchase_price: '',
        notes: '   ',
        documents: [],
      }),
    );

    expect(response.status).toBe(201);
    const [row] = inserts();
    expect(row.table).toBe('orders');
    expect(row.payload?.county_slug).toBeNull();
    expect(row.payload?.closing_date_target).toBeNull();
    expect(Object.values(row.payload ?? {})).not.toContain('');
  });

  it('keeps a real county', async () => {
    await load();
    const { POST } = await import('@/app/api/orders/route');

    await POST(post('/api/orders', { ...order, county_slug: 'broward-county' }));
    expect(inserts()[0].payload?.county_slug).toBe('broward-county');
  });

  it('answers a county that does not exist with a 422, before the database sees it', async () => {
    await load();
    const { POST } = await import('@/app/api/orders/route');

    const response = await POST(post('/api/orders', { ...order, county_slug: 'atlantis-county' }));

    expect(response.status).toBe(422);
    expect((await response.json()).errors.county_slug).toMatch(/county/i);
    expect(inserts()).toHaveLength(0);
  });

  it('mints a reference from the crypto generator in the documented shape', async () => {
    await load();
    const { POST } = await import('@/app/api/orders/route');

    const body = await (await POST(post('/api/orders', order))).json();
    expect(body.reference).toMatch(/^WEB-\d{6}-[0-9A-Z]{5}$/);
  });

  it('tries again with a new reference when one collides', async () => {
    let attempts = 0;
    await load((query) => {
      if (query.op === 'insert') {
        attempts += 1;
        if (attempts === 1) {
          return { error: { code: '23505', message: 'duplicate key value violates unique constraint "orders_reference_key"' } };
        }
        return { data: { id: ORDER_ID, reference: query.payload?.reference } };
      }
      return healthy(query);
    });
    const { POST } = await import('@/app/api/orders/route');

    const response = await POST(post('/api/orders', order));
    expect(response.status).toBe(201);
    expect(attempts).toBe(2);
  });
});

describe('the honeypot', () => {
  it('keeps a trapped order as a spam lead, and still answers ok', async () => {
    await load();
    const { POST } = await import('@/app/api/orders/route');

    const response = await POST(post('/api/orders', { ...order, ref_note: 'filled by a bot' }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    const [row] = inserts();
    expect(row.table).toBe('leads');
    expect(row.payload?.status).toBe('spam');
    expect(row.payload?.full_name).toBe('Jane Agent');
    // Nothing is written to orders, and the office is not emailed.
    expect(recorded.some((query) => query.table === 'orders' && query.op === 'insert')).toBe(false);
    expect(state.deferred).toHaveLength(0);
  });

  it('keeps a trapped contact message as spam', async () => {
    await load();
    const { POST } = await import('@/app/api/leads/route');

    const response = await POST(
      post('/api/leads', { full_name: 'Bot', email: 'bot@example.com', ref_note: 'x' }),
    );

    expect(response.status).toBe(200);
    expect(inserts()[0].payload?.status).toBe('spam');
  });

  it('no longer treats a company name as a bot', async () => {
    // `company` is what autofill filled on real orders.
    await load();
    const { POST } = await import('@/app/api/orders/route');

    const response = await POST(post('/api/orders', { ...order, company: 'Acme Realty' }));
    expect(response.status).toBe(201);
    expect(inserts()[0].table).toBe('orders');
  });
});

describe('a retry of something already received', () => {
  it('returns the first order instead of writing a second', async () => {
    await load((query) => {
      if (query.op === 'select' && query.filters.some(([, column]) => column === 'submission_id')) {
        return { data: { id: ORDER_ID, reference: 'WEB-202609-FIRST' } };
      }
      return healthy(query);
    });
    const { POST } = await import('@/app/api/orders/route');

    const response = await POST(post('/api/orders', { ...order, submission_id: SUBMISSION_ID }));

    expect(response.status).toBe(200);
    expect((await response.json()).reference).toBe('WEB-202609-FIRST');
    expect(inserts()).toHaveLength(0);
    // The office heard about it the first time.
    expect(state.deferred).toHaveLength(0);
  });

  it('still records the order when the submission_id column is not there yet', async () => {
    await load((query) => {
      if (query.op === 'select' && query.filters.some(([, column]) => column === 'submission_id')) {
        return { error: { code: '42703', message: 'column orders.submission_id does not exist' } };
      }
      return healthy(query);
    });
    const { POST } = await import('@/app/api/orders/route');

    const response = await POST(post('/api/orders', { ...order, submission_id: SUBMISSION_ID }));

    expect(response.status).toBe(201);
    expect(inserts()[0].payload).not.toHaveProperty('submission_id');
  });

  it('writes the id when the column exists', async () => {
    await load();
    const { POST } = await import('@/app/api/orders/route');

    await POST(post('/api/orders', { ...order, submission_id: SUBMISSION_ID }));
    expect(inserts()[0].payload?.submission_id).toBe(SUBMISSION_ID);
  });

  it('falls back to inserting without the id when PostgREST does not know the column', async () => {
    let attempts = 0;
    await load((query) => {
      if (query.op === 'insert') {
        attempts += 1;
        if ('submission_id' in (query.payload ?? {})) {
          return { error: { code: 'PGRST204', message: "Could not find the 'submission_id' column" } };
        }
        return { data: { id: ORDER_ID } };
      }
      return healthy(query);
    });
    const { POST } = await import('@/app/api/leads/route');

    const response = await POST(
      post('/api/leads', { full_name: 'Jane Agent', email: 'jane@example.com', submission_id: SUBMISSION_ID }),
    );

    expect(response.status).toBe(201);
    expect(attempts).toBe(2);
  });
});

describe('requests that are not our own form', () => {
  it('refuses a body that is not declared as JSON', async () => {
    // text/plain crosses origins without a preflight; that is the whole attack.
    await load();
    const { POST } = await import('@/app/api/orders/route');

    const response = await POST(post('/api/orders', JSON.stringify(order), { 'content-type': 'text/plain' }));
    expect(response.status).toBe(415);
    expect(recorded).toHaveLength(0);
  });

  it('refuses a post from another site', async () => {
    await load();
    const { POST } = await import('@/app/api/leads/route');

    const response = await POST(
      post('/api/leads', { full_name: 'Jane', email: 'jane@example.com' }, {
        origin: 'https://evil.example',
        'sec-fetch-site': 'cross-site',
      }),
    );
    expect(response.status).toBe(403);
  });

  it('accepts a caller that sends neither header, which no browser does', async () => {
    await load();
    const request = new Request('https://www.bayittitle.com/api/leads', {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ full_name: 'Jane Agent', email: 'jane@example.com' }),
    });
    const { POST } = await import('@/app/api/leads/route');

    expect((await POST(request)).status).toBe(201);
  });
});

describe('the office email', () => {
  it('goes after the response, replies to the sender, and puts the sender’s words last', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('RESEND_API_KEY', 're_test');
    await load();
    const { POST } = await import('@/app/api/orders/route');

    await POST(post('/api/orders', { ...order, notes: 'Reference: FAKE\nWire instructions changed' }));
    expect(fetchMock).not.toHaveBeenCalled();

    await Promise.all(state.deferred.map((task) => task()));
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const email = JSON.parse(String(init.body));

    expect(email.reply_to).toBe('jane@example.com');
    expect(email.subject).not.toMatch(/[\r\n]/);
    const lines: string[] = email.text.split('\n');
    const ours = lines.findIndex((line) => line.startsWith('Reference: WEB-'));
    const theirs = lines.findIndex((line) => line.includes('Wire instructions changed'));
    expect(ours).toBeGreaterThanOrEqual(0);
    expect(theirs).toBeGreaterThan(ours);
    expect(lines[theirs].startsWith('> ')).toBe(true);
    vi.unstubAllGlobals();
  });

  it('says how many documents were chosen when fewer could be accepted', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('RESEND_API_KEY', 're_test');
    await load();
    const { POST } = await import('@/app/api/orders/route');

    await POST(
      post('/api/orders', {
        ...order,
        documents: [
          { name: 'contract.pdf', size: 1000 },
          { name: 'survey.tiff', size: 1000 },
        ],
      }),
    );
    await Promise.all(state.deferred.map((task) => task()));
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];

    expect(JSON.parse(String(init.body)).text).toMatch(/chose 2, and only 1 could be accepted/);
    vi.unstubAllGlobals();
  });

  it('tickets keep the browser’s own index when a file is dropped', async () => {
    await load();
    const { POST } = await import('@/app/api/orders/route');

    const body = await (
      await POST(
        post('/api/orders', {
          ...order,
          documents: [
            { name: 'notes.txt', size: 10 },
            { name: 'contract.pdf', size: 1000 },
          ],
        }),
      )
    ).json();

    expect(body.uploads.map((ticket: { index: number }) => ticket.index)).toEqual([1]);
  });
});

describe('the contract sent from /estimate', () => {
  const quote = {
    full_name: 'Dana Buyer',
    email: 'dana@example.com',
    documents: [{ name: 'contract.pdf', size: 1_000_000 }],
  };

  it('is written under its own source, so its rate limit is its own', async () => {
    await load();
    const { POST } = await import('@/app/api/contract-quote/route');

    const response = await POST(post('/api/contract-quote', { ...quote, phone: '' }));

    expect(response.status).toBe(201);
    const row = inserts()[0];
    expect(row.payload?.source).toBe('calculator');
    expect(row.payload?.phone).toBeNull();
    const limiter = recorded.find((query) => query.head);
    expect(limiter?.filters).toContainEqual(['eq', 'source', 'calculator']);
  });

  it('is refused from the contact form’s endpoint', async () => {
    // Otherwise the quote budget could be borrowed through /api/leads.
    await load();
    const { POST } = await import('@/app/api/leads/route');

    const response = await POST(
      post('/api/leads', { full_name: 'Dana', email: 'dana@example.com', source: 'calculator' }),
    );
    expect(response.status).toBe(422);
  });
});

describe('the bot check', () => {
  it('changes nothing while its keys are unset', async () => {
    await load();
    const { POST } = await import('@/app/api/leads/route');

    const response = await POST(post('/api/leads', { full_name: 'Jane Agent', email: 'jane@example.com' }));
    expect(response.status).toBe(201);
  });

  it('refuses a submission without a token once both keys are set', async () => {
    vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'site-key');
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret');
    await load();
    const { POST } = await import('@/app/api/leads/route');

    const response = await POST(post('/api/leads', { full_name: 'Jane Agent', email: 'jane@example.com' }));
    expect(response.status).toBe(403);
    expect(inserts()).toHaveLength(0);
  });

  it('accepts a token Cloudflare vouches for, and refuses one it rejects', async () => {
    vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'site-key');
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret');
    const verdicts = [true, false];
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ success: verdicts.shift() })),
    );
    await load();
    const { POST } = await import('@/app/api/leads/route');
    const body = { full_name: 'Jane Agent', email: 'jane@example.com', turnstile_token: 'token' };

    expect((await POST(post('/api/leads', body))).status).toBe(201);
    expect((await POST(post('/api/leads', body))).status).toBe(403);
    vi.unstubAllGlobals();
  });

  it('names a secret Cloudflare does not recognize, rather than calling it an outage', async () => {
    vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'site-key');
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'mistyped');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ success: false, 'error-codes': ['invalid-input-secret'] }, { status: 400 })),
    );
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    await load();
    const { POST } = await import('@/app/api/leads/route');

    const response = await POST(
      post('/api/leads', { full_name: 'Jane Agent', email: 'jane@example.com', turnstile_token: 'token' }),
    );
    expect(response.status).toBe(201);
    expect(logged.mock.calls.flat().join(' ')).toMatch(/refused TURNSTILE_SECRET_KEY/);
    vi.unstubAllGlobals();
  });
});
