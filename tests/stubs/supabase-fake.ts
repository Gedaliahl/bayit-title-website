// A stand-in for the service-role client, for the Route Handler tests.
//
// It records every query as a plain object — which table, which operation,
// what payload, which filters — and answers each one through a function the
// test supplies. That is enough to assert what would have been written to the
// database without a database, which is the thing these tests care about.
import { vi } from 'vitest';

export interface Query {
  table: string;
  op: 'select' | 'insert' | 'update' | 'delete';
  payload?: Record<string, unknown>;
  filters: [string, string, unknown][];
  head?: boolean;
}

export interface Answer {
  data?: unknown;
  error?: { code?: string; message: string } | null;
  count?: number | null;
}

export type Responder = (query: Query) => Answer;

export function fakeSupabase(respond: Responder = () => ({ data: null, error: null })) {
  const queries: Query[] = [];

  function builder(table: string) {
    const query: Query = { table, op: 'select', filters: [] };
    const chain: Record<string, unknown> = {};
    const filter =
      (kind: string) =>
      (column: string, value: unknown) => {
        query.filters.push([kind, column, value]);
        return chain;
      };

    Object.assign(chain, {
      select: (_columns?: string, options?: { head?: boolean }) => {
        if (options?.head) query.head = true;
        return chain;
      },
      insert: (payload: Record<string, unknown>) => {
        query.op = 'insert';
        query.payload = payload;
        return chain;
      },
      update: (payload: Record<string, unknown>) => {
        query.op = 'update';
        query.payload = payload;
        return chain;
      },
      delete: () => {
        query.op = 'delete';
        return chain;
      },
      eq: filter('eq'),
      neq: filter('neq'),
      gte: filter('gte'),
      lte: filter('lte'),
      in: filter('in'),
      limit: () => chain,
      abortSignal: () => chain,
      single: () => chain,
      maybeSingle: () => chain,
      then: (resolve: (answer: Answer) => unknown) => {
        queries.push(query);
        const answer = respond(query);
        return Promise.resolve({ data: null, error: null, count: null, ...answer }).then(resolve);
      },
    });
    return chain;
  }

  const bucket = {
    list: vi.fn(async () => ({ data: [] as unknown[], error: null })),
    remove: vi.fn(async () => ({ data: [], error: null })),
    createSignedUrl: vi.fn(async (path: string) => ({ data: { signedUrl: `https://signed.test/${path}` }, error: null })),
    createSignedUploadUrl: vi.fn(async (path: string) => ({
      data: { signedUrl: `https://upload.test/${path}` },
      error: null,
    })),
  };

  const client = {
    from: (table: string) => builder(table),
    storage: {
      from: () => bucket,
      getBucket: vi.fn(async () => ({ data: { public: false }, error: null })),
    },
  };

  return { client, queries, bucket };
}
