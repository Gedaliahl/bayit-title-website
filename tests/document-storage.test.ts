/**
 * What happens to an upload once the browser says it is done.
 *
 * The request that handed out the upload links saw only the sizes and names
 * the browser declared, and both are whatever the sender says. These tests are
 * about the second look: the real sizes read off the bucket, the bytes read
 * off the file, and what is deleted when either disagrees with the promise.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase } from './stubs/supabase-fake';

const state = vi.hoisted(() => ({ client: null as unknown }));

vi.mock('@/lib/supabase', () => ({
  requireServiceClient: () => state.client,
  getServiceClient: () => state.client,
}));

const ORDER = '11111111-1111-4111-8111-111111111111';
const MB = 1024 * 1024;

const PDF = new TextEncoder().encode('%PDF-1.7\n...');
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const EXE = new TextEncoder().encode('MZ\x90\x00 this program cannot be run');

/** Serves each signed link's bytes, as storage would. */
function serve(bytesFor: Record<string, Uint8Array>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const path = Object.keys(bytesFor).find((key) => url.endsWith(key));
      return path ? new Response(new Blob([bytesFor[path] as BlobPart]), { status: 206 }) : new Response('missing', { status: 404 });
    }),
  );
}

function stored(name: string, size: number) {
  return { name, id: name, created_at: new Date().toISOString(), metadata: { size } };
}

async function setUp(objects: ReturnType<typeof stored>[], recorded: { storage_path: string; size_bytes: number }[] = []) {
  vi.resetModules();
  const fake = fakeSupabase((query) =>
    query.table === 'order_documents' && query.op === 'select' ? { data: recorded } : { data: null },
  );
  fake.bucket.list.mockResolvedValue({ data: objects, error: null });
  state.client = fake.client;
  const storage = await import('@/lib/document-storage');
  return { fake, storage };
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('confirming an order’s documents', () => {
  it('records a file whose bytes match its name', async () => {
    const { fake, storage } = await setUp([stored('a.pdf', 12)]);
    serve({ [`orders/${ORDER}/a.pdf`]: PDF });

    const result = await storage.registerUploadedDocuments(ORDER, [{ path: `orders/${ORDER}/a.pdf`, name: 'contract.pdf' }]);

    expect(result.kept.map((doc) => doc.originalName)).toEqual(['contract.pdf']);
    expect(result.rejected).toEqual([]);
    expect(fake.bucket.remove).not.toHaveBeenCalled();
  });

  it('deletes a file that only calls itself a PDF, and says why', async () => {
    const { fake, storage } = await setUp([stored('a.pdf', 40)]);
    serve({ [`orders/${ORDER}/a.pdf`]: EXE });

    const result = await storage.registerUploadedDocuments(ORDER, [{ path: `orders/${ORDER}/a.pdf`, name: 'invoice.pdf' }]);

    expect(result.kept).toEqual([]);
    expect(result.rejected).toEqual([{ name: 'invoice.pdf', reason: 'its contents are not a PDF' }]);
    expect(fake.bucket.remove).toHaveBeenCalledWith([`orders/${ORDER}/a.pdf`]);
  });

  it('holds the promised 60 MB in total against the real sizes, not the declared ones', async () => {
    const objects = [stored('1.png', 24 * MB), stored('2.png', 24 * MB), stored('3.png', 24 * MB)];
    const { fake, storage } = await setUp(objects);
    serve(Object.fromEntries(objects.map((object) => [`orders/${ORDER}/${object.name}`, PNG])));

    const result = await storage.registerUploadedDocuments(
      ORDER,
      objects.map((object) => ({ path: `orders/${ORDER}/${object.name}`, name: object.name })),
    );

    expect(result.kept).toHaveLength(2);
    expect(result.rejected).toEqual([{ name: '3.png', reason: 'over 60 MB in all' }]);
    expect(fake.bucket.remove).toHaveBeenCalledWith([`orders/${ORDER}/3.png`]);
  });

  it('counts what an earlier confirmation kept towards the limits', async () => {
    const { storage } = await setUp([stored('new.png', 24 * MB)], [
      { storage_path: `orders/${ORDER}/old.pdf`, size_bytes: 40 * MB },
    ]);
    serve({ [`orders/${ORDER}/new.png`]: PNG });

    const result = await storage.registerUploadedDocuments(ORDER, [{ path: `orders/${ORDER}/new.png`, name: 'new.png' }]);
    expect(result.rejected[0]?.reason).toBe('over 60 MB in all');
  });

  it('leaves a document to the confirmation that recorded it first, without calling it a failure', async () => {
    vi.resetModules();
    const fake = fakeSupabase((query) =>
      query.table === 'order_documents' && query.op === 'insert'
        ? { data: null, error: { code: '23505', message: 'duplicate key value' } }
        : { data: [] },
    );
    fake.bucket.list.mockResolvedValue({ data: [stored('a.pdf', 12)], error: null });
    state.client = fake.client;
    serve({ [`orders/${ORDER}/a.pdf`]: PDF });
    const storage = await import('@/lib/document-storage');

    const result = await storage.registerUploadedDocuments(ORDER, [{ path: `orders/${ORDER}/a.pdf`, name: 'a.pdf' }]);
    expect(result.kept).toEqual([]);
    expect(console.error).not.toHaveBeenCalled();
  });

  it('keeps a file it could not read, marked so the office knows', async () => {
    const { storage } = await setUp([stored('a.pdf', 12)]);
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('timeout'); }));

    const result = await storage.registerUploadedDocuments(ORDER, [{ path: `orders/${ORDER}/a.pdf`, name: 'a.pdf' }]);
    expect(result.kept[0]?.unchecked).toBe(true);
    expect(storage.describeConfirmation(result).join('\n')).toMatch(/could not be checked/);
  });
});

describe('a contract sent for pricing', () => {
  it('holds the whole contract to 25 MB', async () => {
    const objects = [stored('1.pdf', 20 * MB), stored('2.pdf', 10 * MB)];
    const { storage } = await quoteSetUp(objects, {});

    const result = await storage.signQuoteDocuments(
      ORDER,
      objects.map((object) => ({ path: `quotes/${ORDER}/${object.name}`, name: object.name })),
    );
    expect(result.kept).toHaveLength(1);
    expect(result.rejected[0]?.reason).toBe('over 25 MB in all');
  });

  /** A lead's folder, with quote_documents answering as `claims` says. */
  async function quoteSetUp(
    objects: ReturnType<typeof stored>[],
    claims: {
      sent?: { storage_path: string; size_bytes: number }[];
      won?: (paths: string[]) => string[];
      missing?: boolean;
    },
  ) {
    vi.resetModules();
    const missing = { code: 'PGRST205', message: 'no such table' };
    const fake = fakeSupabase((query) => {
      if (query.table !== 'quote_documents') return { data: null };
      if (claims.missing) return { data: null, error: missing };
      if (query.op === 'select') return { data: claims.sent ?? [] };
      const rows = query.payload as unknown as { storage_path: string }[];
      const paths = rows.map((row) => row.storage_path);
      return { data: (claims.won ?? ((all) => all))(paths).map((path) => ({ storage_path: path })) };
    });
    fake.bucket.list.mockResolvedValue({ data: objects, error: null });
    state.client = fake.client;
    serve(Object.fromEntries(objects.map((object) => [`quotes/${ORDER}/${object.name}`, PDF])));
    return { fake, storage: await import('@/lib/document-storage') };
  }

  const pages = (...names: string[]) => names.map((name) => ({ path: `quotes/${ORDER}/${name}`, name }));

  it('does not send the office a page it has already been sent', async () => {
    const { storage } = await quoteSetUp([stored('1.pdf', MB), stored('2.pdf', MB)], {
      sent: [{ storage_path: `quotes/${ORDER}/1.pdf`, size_bytes: MB }],
    });

    const result = await storage.signQuoteDocuments(ORDER, pages('1.pdf', '2.pdf'));
    expect(result.kept.map((doc) => doc.storagePath)).toEqual([`quotes/${ORDER}/2.pdf`]);
  });

  it('leaves a page to the confirmation that claimed it first', async () => {
    const { storage } = await quoteSetUp([stored('1.pdf', MB), stored('2.pdf', MB)], {
      won: (paths) => paths.filter((path) => path.endsWith('2.pdf')),
    });

    const result = await storage.signQuoteDocuments(ORDER, pages('1.pdf', '2.pdf'));
    expect(result.kept.map((doc) => doc.storagePath)).toEqual([`quotes/${ORDER}/2.pdf`]);
  });

  it('sends every page while the table that records them does not exist yet', async () => {
    const { storage } = await quoteSetUp([stored('1.pdf', MB), stored('2.pdf', MB)], { missing: true });
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await storage.signQuoteDocuments(ORDER, pages('1.pdf', '2.pdf'));
    expect(result.kept).toHaveLength(2);
  });
});

describe('the office’s download links', () => {
  it('last a day, and the email says so', async () => {
    const { fake, storage } = await setUp([stored('a.pdf', 12)]);
    serve({ [`orders/${ORDER}/a.pdf`]: PDF });

    await storage.registerUploadedDocuments(ORDER, [{ path: `orders/${ORDER}/a.pdf`, name: 'a.pdf' }]);

    const ttls = fake.bucket.createSignedUrl.mock.calls.map((call) => (call as unknown as [string, number])[1]);
    expect(Math.max(...ttls)).toBe(24 * 60 * 60);
    expect(storage.DOWNLOAD_LINK_HOURS).toBe(24);
  });
});

describe('how long a contract is kept', () => {
  it('defaults to 30 days', async () => {
    const { storage } = await setUp([]);
    expect(storage.quoteRetentionDays()).toBe(30);
  });

  it('takes the environment’s figure, and ignores one that is not a whole number of days', async () => {
    const { storage } = await setUp([]);
    vi.stubEnv('QUOTE_RETENTION_DAYS', '14');
    expect(storage.quoteRetentionDays()).toBe(14);
    vi.stubEnv('QUOTE_RETENTION_DAYS', '365');
    expect(storage.quoteRetentionDays()).toBe(365);
    vi.stubEnv('QUOTE_RETENTION_DAYS', 'soon');
    expect(storage.quoteRetentionDays()).toBe(30);
  });
});

describe('the daily purge', () => {
  it('deletes contracts before they pass the limit, and order documents on their purge date', async () => {
    vi.resetModules();
    const now = new Date('2026-10-30T09:00:00Z');
    const fake = fakeSupabase((query) => {
      if (query.table === 'order_documents' && query.op === 'select' && query.filters.some(([kind]) => kind === 'lte')) {
        return { data: [{ id: 'row-1', storage_path: `orders/${ORDER}/old.pdf` }] };
      }
      if (query.table === 'order_documents' && query.op === 'select') {
        return { data: [{ storage_path: `orders/${ORDER}/kept.pdf` }] };
      }
      return { data: null };
    });
    const days = (count: number) => new Date(now.getTime() - count * 24 * 60 * 60 * 1000).toISOString();
    fake.bucket.list.mockImplementation((async (prefix: string) => {
      const listing: Record<string, unknown[]> = {
        quotes: [{ name: 'lead-a', id: null }],
        'quotes/lead-a': [
          { name: 'old.pdf', id: '1', created_at: days(29.5) },
          { name: 'new.pdf', id: '2', created_at: days(3) },
        ],
        orders: [{ name: ORDER, id: null }],
        [`orders/${ORDER}`]: [
          { name: 'kept.pdf', id: '3', created_at: days(5) },
          { name: 'abandoned.pdf', id: '4', created_at: days(5) },
          { name: 'fresh.pdf', id: '5', created_at: days(0.1) },
        ],
      };
      return { data: listing[prefix] ?? [], error: null };
    }) as never);
    state.client = fake.client;
    const { purgeExpiredDocuments } = await import('@/lib/document-storage');

    const report = await purgeExpiredDocuments(now);

    const removed = fake.bucket.remove.mock.calls.flatMap((call) => (call as unknown as [string[]])[0]);
    expect(removed).toContain('quotes/lead-a/old.pdf');
    expect(removed).not.toContain('quotes/lead-a/new.pdf');
    expect(removed).toContain(`orders/${ORDER}/old.pdf`);
    expect(removed).toContain(`orders/${ORDER}/abandoned.pdf`);
    // Recorded, or still inside the window to be confirmed: left alone.
    expect(removed).not.toContain(`orders/${ORDER}/kept.pdf`);
    expect(removed).not.toContain(`orders/${ORDER}/fresh.pdf`);
    expect(report).toEqual({ quotePages: 1, orderDocuments: 1, abandonedUploads: 1, failed: [] });
  });

  it('still deletes the contracts when the order side cannot be read', async () => {
    vi.resetModules();
    const now = new Date('2026-10-30T09:00:00Z');
    const fake = fakeSupabase((query) =>
      query.table === 'order_documents' ? { data: null, error: { message: 'connection reset' } } : { data: null },
    );
    fake.bucket.list.mockImplementation((async (prefix: string) => {
      const listing: Record<string, unknown[]> = {
        quotes: [{ name: 'lead-a', id: null }],
        'quotes/lead-a': [{ name: 'old.pdf', id: '1', created_at: '2026-09-01T00:00:00Z' }],
      };
      return { data: listing[prefix] ?? [], error: null };
    }) as never);
    state.client = fake.client;
    const { purgeExpiredDocuments } = await import('@/lib/document-storage');

    const report = await purgeExpiredDocuments(now);

    expect(report.quotePages).toBe(1);
    expect(report.failed).toEqual(['orderDocuments']);
    const deletedRows = fake.queries.filter((query) => query.table === 'quote_documents' && query.op === 'delete');
    expect(deletedRows[0]?.filters).toContainEqual(['in', 'storage_path', ['quotes/lead-a/old.pdf']]);
  });
});
