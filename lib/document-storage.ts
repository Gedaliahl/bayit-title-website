// Storage operations for order documents.
//
// Files never pass through this application. The browser uploads straight to
// Supabase Storage with a short-lived signed URL minted here. That is partly a
// platform limit — a serverless function body caps out around 4.5 MB, and a
// survey PDF clears that on its own — and partly the safer shape: the bucket
// stays private, the service-role key stays on the server, and the browser is
// handed permission to write exactly one object at exactly one path.
import 'server-only';

import { randomUUID } from 'node:crypto';

import { requireServiceClient } from './supabase';
import {
  BUCKET,
  MAX_CONTRACT_TOTAL_BYTES,
  MAX_FILES,
  MAX_FILE_BYTES,
  MAX_TOTAL_BYTES,
  QUOTE_RETENTION_DAYS,
  RETENTION_DAYS,
  contentMatches,
  contentTypeFor,
  extensionOf,
  formatBytes,
  isContractFile,
  sanitizeName,
  type DeclaredDocument,
  type Rejection,
} from './documents';

/** A confirmation can only ever cover an order opened in this window. */
const CONFIRM_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * How long the office's download links stay live. A day: long enough to open
 * the email, short enough that a forwarded or leaked message stops handing out
 * someone's contract, payoff letter or ID by the end of it. The emails say so.
 */
export const DOWNLOAD_LINK_HOURS = 24;
const DOWNLOAD_URL_TTL_SECONDS = DOWNLOAD_LINK_HOURS * 60 * 60;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Which kind of submission a document belongs to. An order's documents sit
 * under `orders/`, a contract sent for pricing from /estimate under `quotes/`,
 * so the folder says what the file is before anyone opens it.
 */
export type DocumentFolder = 'orders' | 'quotes';

/**
 * Storage paths are generated, never derived from the filename. A caller who
 * cannot guess a path cannot overwrite someone else's document, and nothing a
 * client typed ends up in a storage key or a log line.
 */
function buildStoragePath(folder: DocumentFolder, ownerId: string, filename: string): string {
  return `${folder}/${ownerId}/${randomUUID()}${extensionOf(filename)}`;
}

/** A declared document, with its position in the list the browser sent. */
export interface IndexedDocument extends DeclaredDocument {
  index: number;
}

export interface UploadTicket {
  /**
   * Position in the list the browser declared. Names repeat and the server may
   * drop an entry, so the index is what reliably ties a ticket to its file —
   * which is why it is the browser's own position, carried through whatever
   * the route filtered out, and not a count of what survived.
   */
  index: number;
  name: string;
  path: string;
  contentType: string;
  /** A one-time, short-lived URL the browser PUTs the bytes to. */
  url: string;
}

/**
 * Mints one upload URL per declared document.
 *
 * Nothing is written to `order_documents` here. A ticket is permission to
 * upload, not evidence that an upload happened — the row is created on
 * confirmation, once the object has been seen in the bucket. An abandoned
 * ticket therefore leaves no record of a document the office does not have.
 */
export async function mintUploadTickets(
  ownerId: string,
  documents: IndexedDocument[],
  folder: DocumentFolder = 'orders',
): Promise<UploadTicket[]> {
  const supabase = requireServiceClient();
  const tickets: UploadTicket[] = [];

  for (const doc of documents) {
    const contentType = contentTypeFor(doc.name);
    if (!contentType) continue;

    const path = buildStoragePath(folder, ownerId, doc.name);
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);

    if (error || !data) {
      // One failed ticket must not cost the others, and never the order.
      console.error(`[documents] could not mint an upload URL in ${folder}/${ownerId}:`, error?.message);
      continue;
    }

    tickets.push({ index: doc.index, name: doc.name, path, contentType, url: data.signedUrl });
  }

  return tickets;
}

/** A document the browser says it has finished uploading. */
export interface UploadedDocument {
  path: string;
  /** What the sender called it. A label for the office, never a storage key. */
  name: string;
}

export interface RegisteredDocument {
  originalName: string;
  storagePath: string;
  sizeBytes: number;
  /** Signed link for the notification email, or null if signing failed. */
  downloadUrl: string | null;
  /** True when the bytes could not be read to check them; the office is told. */
  unchecked?: boolean;
}

/** What a confirmation kept, and what it deleted and why. */
export interface Confirmation {
  kept: RegisteredDocument[];
  rejected: Rejection[];
}

interface Limits {
  maxTotalBytes: number;
  /** Extensions this kind of upload takes, which may be fewer than the bucket allows. */
  accepts: (filename: string) => boolean;
}

const ORDER_LIMITS: Limits = { maxTotalBytes: MAX_TOTAL_BYTES, accepts: (name) => contentTypeFor(name) !== null };
const CONTRACT_LIMITS: Limits = { maxTotalBytes: MAX_CONTRACT_TOTAL_BYTES, accepts: isContractFile };

interface Candidate {
  path: string;
  name: string;
  sizeBytes: number;
  contentType: string;
}

/**
 * The confirm-time gate every upload passes through.
 *
 * The request that minted the tickets saw only the sizes the browser declared,
 * and a declared size is whatever the sender says it is: ten tickets for "1 KB"
 * files could land 250 MB. So the real sizes are read off the stored objects,
 * the limits the copy promises are applied to those, and each object is opened
 * to check its bytes against its name. Anything that fails is deleted from the
 * bucket, not just left out of the email, and comes back with a reason so the
 * sender and the office can both be told what did not make it.
 *
 * `alreadyKept` is what an earlier confirmation for the same owner accepted.
 * It counts towards the limits, so retrying cannot stretch them.
 */
async function vetUploads(
  folder: DocumentFolder,
  ownerId: string,
  documents: UploadedDocument[],
  alreadyKept: { path: string; sizeBytes: number }[],
  limits: Limits,
): Promise<{ kept: (Candidate & { unchecked: boolean })[]; rejected: Rejection[] }> {
  const supabase = requireServiceClient();
  const bucket = supabase.storage.from(BUCKET);

  // One listing per owner rather than one call per path.
  const { data: objects, error } = await bucket.list(`${folder}/${ownerId}`, { limit: MAX_FILES * 4 });
  if (error) throw new Error(`could not list uploads: ${error.message}`);

  const present = new Map((objects ?? []).map((object) => [`${folder}/${ownerId}/${object.name}`, object]));
  const seen = new Set(alreadyKept.map((doc) => doc.path));
  let count = alreadyKept.length;
  let total = alreadyKept.reduce((sum, doc) => sum + doc.sizeBytes, 0);

  const kept: (Candidate & { unchecked: boolean })[] = [];
  const rejected: Rejection[] = [];
  const doomed: string[] = [];

  for (const { path, name } of documents) {
    const object = present.get(path);
    // Not in the bucket, or already handled by an earlier confirmation: a
    // retry, or a path that was never uploaded. Neither is news to anyone.
    if (!object || seen.has(path)) continue;
    seen.add(path);

    const label = sanitizeName(name);
    const sizeBytes = Number(object.metadata?.size ?? 0);
    const contentType = contentTypeFor(path);

    const reason = !contentType || !limits.accepts(path)
      ? 'not a type we take'
      : sizeBytes > MAX_FILE_BYTES
        ? `over ${formatBytes(MAX_FILE_BYTES)}`
        : count + 1 > MAX_FILES
          ? `more than ${MAX_FILES} files`
          : total + sizeBytes > limits.maxTotalBytes
            ? `over ${formatBytes(limits.maxTotalBytes)} in all`
            : null;

    if (reason) {
      rejected.push({ name: label, reason });
      doomed.push(path);
      continue;
    }

    const verdict = await inspect(path, contentType!, sizeBytes);
    if (verdict === 'mismatch') {
      rejected.push({ name: label, reason: `its contents are not a ${describeType(contentType!)}` });
      doomed.push(path);
      continue;
    }

    count += 1;
    total += sizeBytes;
    kept.push({ path, name: label, sizeBytes, contentType: contentType!, unchecked: verdict === 'unread' });
  }

  if (doomed.length > 0) {
    const { error: removeError } = await bucket.remove(doomed);
    if (removeError) console.error(`[documents] could not delete refused uploads in ${folder}/${ownerId}:`, removeError.message);
  }

  return { kept, rejected };
}

function describeType(contentType: string): string {
  switch (contentType) {
    case 'application/pdf':
      return 'PDF';
    case 'image/jpeg':
      return 'JPG';
    case 'image/png':
      return 'PNG';
    case 'image/heic':
      return 'HEIC photo';
    default:
      return 'Word document';
  }
}

const HEAD_BYTES = 4096;
const TAIL_BYTES = 64 * 1024;

/**
 * Reads the start of a stored object — and for a Word file, its end — and asks
 * whether the bytes match the name.
 *
 * When the object cannot be read at all, the file is kept and marked
 * unchecked rather than deleted: throwing away a real contract because the
 * storage read timed out is the worse failure, and the office is told which
 * files were not checked.
 */
async function inspect(path: string, contentType: string, sizeBytes: number): Promise<'ok' | 'mismatch' | 'unread'> {
  const supabase = requireServiceClient();
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
  if (!data) return 'unread';

  try {
    const head = await readBytes(data.signedUrl, `bytes=0-${HEAD_BYTES - 1}`, HEAD_BYTES);
    if (contentMatches(contentType, head)) return 'ok';

    const zip = head[0] === 0x50 && head[1] === 0x4b;
    if (!zip || sizeBytes <= HEAD_BYTES) return 'mismatch';

    const tail = await readTail(data.signedUrl, TAIL_BYTES);
    return contentMatches(contentType, head, tail) ? 'ok' : 'mismatch';
  } catch (error) {
    console.error(`[documents] could not read ${path} to check it:`, (error as Error).message);
    return 'unread';
  }
}

/** Up to `limit` bytes of a ranged read, stopping early if the range is ignored. */
async function readBytes(url: string, range: string, limit: number): Promise<Uint8Array> {
  const response = await fetch(url, { headers: { Range: range }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok || !response.body) throw new Error(`read answered ${response.status}`);

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (length < limit) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    length += value.length;
  }
  await reader.cancel();
  return concat(chunks).subarray(0, limit);
}

/** The last `limit` bytes, even from a server that answers a suffix range with the whole object. */
async function readTail(url: string, limit: number): Promise<Uint8Array> {
  const response = await fetch(url, { headers: { Range: `bytes=-${limit}` }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok || !response.body) throw new Error(`read answered ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  return bytes.subarray(Math.max(0, bytes.length - limit));
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

async function signedLink(path: string): Promise<string | null> {
  const supabase = requireServiceClient();
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, DOWNLOAD_URL_TTL_SECONDS);
  return data?.signedUrl ?? null;
}

/**
 * Records the documents that actually arrived.
 *
 * Every path is checked against the bucket before a row is written, so a
 * confirmation can only ever describe objects that exist. That also makes the
 * endpoint safe to expose: a caller holding an order id still cannot register a
 * document, because registering one requires having uploaded it first.
 */
export async function registerUploadedDocuments(
  orderId: string,
  documents: UploadedDocument[],
): Promise<Confirmation> {
  const supabase = requireServiceClient();

  // A retried confirmation — a flaky connection, an impatient second click —
  // must not record the same document twice, and what it already recorded
  // counts towards the limits.
  const { data: existing } = await supabase
    .from('order_documents')
    .select('storage_path, size_bytes')
    .eq('order_id', orderId);

  const { kept, rejected } = await vetUploads(
    'orders',
    orderId,
    documents,
    (existing ?? []).map((row) => ({ path: row.storage_path, sizeBytes: Number(row.size_bytes ?? 0) })),
    ORDER_LIMITS,
  );

  // purge_after is a date column — send a plain YYYY-MM-DD, not a timestamp.
  const purgeAfter = new Date(Date.now() + RETENTION_DAYS * DAY_MS).toISOString().slice(0, 10);
  const registered: RegisteredDocument[] = [];

  for (const doc of kept) {
    // Size and type come from the object itself; only the label is the
    // sender's, because the storage key is a generated UUID and "contract.pdf"
    // is what the office needs to see in the file.
    const { error: insertError } = await supabase.from('order_documents').insert({
      order_id: orderId,
      original_name: doc.name,
      storage_path: doc.path,
      mime_type: doc.contentType,
      size_bytes: doc.sizeBytes,
      purge_after: purgeAfter,
    });

    if (insertError) {
      console.error(`[documents] could not record ${doc.path}:`, insertError.message);
      continue;
    }

    registered.push({
      originalName: doc.name,
      storagePath: doc.path,
      sizeBytes: doc.sizeBytes,
      downloadUrl: await signedLink(doc.path),
      unchecked: doc.unchecked || undefined,
    });
  }

  return { kept: registered, rejected };
}

/**
 * The contract pages a reader sent from /estimate, once they have landed.
 *
 * There is no table for these — a quote is a lead, and `order_documents` hangs
 * off an order — so the bucket listing is the record. Each path is checked
 * against what is actually in the folder before a link is signed, for the same
 * reason as above: a confirmation can only ever describe objects that exist.
 *
 * `notifiedAt` is when the office was last sent this lead's pages. Anything
 * stored before then has been emailed already, so a repeated confirmation
 * does not send the same contract twice; it still counts towards the limits.
 */
export async function signQuoteDocuments(
  leadId: string,
  documents: UploadedDocument[],
  notifiedAt: string | null,
): Promise<Confirmation> {
  const supabase = requireServiceClient();

  let alreadySent: { path: string; sizeBytes: number }[] = [];
  if (notifiedAt) {
    const { data: objects } = await supabase.storage
      .from(BUCKET)
      .list(`quotes/${leadId}`, { limit: MAX_FILES * 4 });
    // Compared as instants: storage and PostgREST write timestamps differently.
    const sentAt = new Date(notifiedAt).getTime();
    alreadySent = (objects ?? [])
      .filter((object) => object.created_at && new Date(object.created_at).getTime() <= sentAt)
      .map((object) => ({ path: `quotes/${leadId}/${object.name}`, sizeBytes: Number(object.metadata?.size ?? 0) }));
  }

  const { kept, rejected } = await vetUploads('quotes', leadId, documents, alreadySent, CONTRACT_LIMITS);

  const signed: RegisteredDocument[] = [];
  for (const doc of kept) {
    signed.push({
      originalName: doc.name,
      storagePath: doc.path,
      sizeBytes: doc.sizeBytes,
      downloadUrl: await signedLink(doc.path),
      unchecked: doc.unchecked || undefined,
    });
  }

  return { kept: signed, rejected };
}

/**
 * The files, one block each, then anything that was deleted and why — so the
 * office is never left expecting a document the sender was told did not go.
 */
export function describeConfirmation({ kept, rejected }: Confirmation): string[] {
  return [
    ...kept.map((doc) =>
      [
        `${doc.originalName} (${Math.round(doc.sizeBytes / 1024)} KB)`,
        doc.unchecked ? 'Its contents could not be checked against its name — open it with care.' : null,
        doc.downloadUrl ?? 'Link unavailable — open the file from Supabase Storage.',
        '',
      ]
        .filter((line) => line !== null)
        .join('\n'),
    ),
    ...(rejected.length > 0
      ? [
          'Deleted on arrival, and the sender was told:',
          ...rejected.map((doc) => `- ${doc.name}: ${doc.reason}`),
          '',
        ]
      : []),
  ];
}

/** An order is only open for document confirmation briefly after it is created. */
export function isWithinConfirmWindow(createdAt: string): boolean {
  const created = new Date(createdAt).getTime();
  return Number.isFinite(created) && Date.now() - created < CONFIRM_WINDOW_MS;
}

/** How many days a contract sent for pricing is kept: the env may shorten the promise, never lengthen it. */
export function quoteRetentionDays(): number {
  const configured = Number(process.env.QUOTE_RETENTION_DAYS);
  return Number.isInteger(configured) && configured > 0
    ? Math.min(configured, QUOTE_RETENTION_DAYS)
    : QUOTE_RETENTION_DAYS;
}

/** Every object under a prefix, a page at a time. Folders come back with a null id. */
async function listAll(prefix: string) {
  const supabase = requireServiceClient();
  const entries = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 100, offset });
    if (error) throw new Error(`could not list ${prefix}: ${error.message}`);
    entries.push(...(data ?? []));
    if (!data || data.length < 100) return entries;
  }
}

/** Compared as instants: storage and PostgREST do not write timestamps the same way. */
function isOlderThan(timestamp: string, cutoff: Date): boolean {
  return new Date(timestamp).getTime() < cutoff.getTime();
}

async function removeAll(paths: string[]): Promise<number> {
  const supabase = requireServiceClient();
  let removed = 0;
  for (let start = 0; start < paths.length; start += 100) {
    const batch = paths.slice(start, start + 100);
    const { error } = await supabase.storage.from(BUCKET).remove(batch);
    if (error) throw new Error(`could not delete: ${error.message}`);
    removed += batch.length;
  }
  return removed;
}

export interface PurgeReport {
  quotePages: number;
  orderDocuments: number;
  abandonedUploads: number;
}

/**
 * The retention the pages promise, carried out.
 *
 * - A contract sent for pricing is deleted before it is older than
 *   `quoteRetentionDays()`. Nothing in `leads` points at the file, so the
 *   folder is the whole of it; the lead itself, a name and an email, is kept
 *   like any other enquiry.
 * - An order document is deleted, object and row, on its `purge_after` date.
 * - An order upload that was never confirmed — the tab closed, or it was
 *   refused and the delete failed — is deleted once the confirm window has
 *   shut, because no row and no email will ever point at it.
 */
export async function purgeExpiredDocuments(now = new Date()): Promise<PurgeReport> {
  const supabase = requireServiceClient();

  // A day early, because the run is daily: the pages promise "no longer than",
  // so nothing may be found older than the limit between one run and the next.
  const quoteCutoff = new Date(now.getTime() - (quoteRetentionDays() - 1) * DAY_MS);
  const quotePaths: string[] = [];
  for (const folder of await listAll('quotes')) {
    if (folder.id) continue;
    for (const object of await listAll(`quotes/${folder.name}`)) {
      if (object.id && object.created_at && isOlderThan(object.created_at, quoteCutoff)) {
        quotePaths.push(`quotes/${folder.name}/${object.name}`);
      }
    }
  }

  const today = now.toISOString().slice(0, 10);
  const { data: expired, error } = await supabase
    .from('order_documents')
    .select('id, storage_path')
    .lte('purge_after', today);
  if (error) throw new Error(`could not read expired documents: ${error.message}`);

  const orderDocuments = await removeAll((expired ?? []).map((row) => row.storage_path));
  if (expired && expired.length > 0) {
    const { error: deleteError } = await supabase
      .from('order_documents')
      .delete()
      .in('id', expired.map((row) => row.id));
    if (deleteError) throw new Error(`could not delete expired rows: ${deleteError.message}`);
  }

  const abandonedCutoff = new Date(now.getTime() - CONFIRM_WINDOW_MS - DAY_MS);
  const abandoned: string[] = [];
  for (const folder of await listAll('orders')) {
    if (folder.id) continue;
    const objects = (await listAll(`orders/${folder.name}`)).filter(
      (object) => object.id && object.created_at && isOlderThan(object.created_at, abandonedCutoff),
    );
    if (objects.length === 0) continue;

    const { data: rows, error: rowsError } = await supabase
      .from('order_documents')
      .select('storage_path')
      .eq('order_id', folder.name);
    // Without the rows there is no telling a recorded document from an
    // abandoned one, and deleting on a guess would take recorded ones too.
    if (rowsError) continue;
    const recorded = new Set((rows ?? []).map((row) => row.storage_path));
    for (const object of objects) {
      const path = `orders/${folder.name}/${object.name}`;
      if (!recorded.has(path)) abandoned.push(path);
    }
  }

  return {
    quotePages: await removeAll(quotePaths),
    orderDocuments,
    abandonedUploads: await removeAll(abandoned),
  };
}
