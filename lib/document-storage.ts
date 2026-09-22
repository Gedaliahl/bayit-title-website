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
  MAX_FILES,
  RETENTION_DAYS,
  contentTypeFor,
  extensionOf,
  sanitizeName,
  type DeclaredDocument,
} from './documents';

/** A confirmation can only ever cover an order opened in this window. */
const CONFIRM_WINDOW_MS = 24 * 60 * 60 * 1000;

/** How long the office's download links stay live. Long enough to read the email. */
const DOWNLOAD_URL_TTL_SECONDS = 7 * 24 * 60 * 60;

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

export interface UploadTicket {
  /**
   * Position in the list the browser declared. Names repeat and the server may
   * drop an entry, so the index is what reliably ties a ticket to its file.
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
  orderId: string,
  documents: DeclaredDocument[],
  folder: DocumentFolder = 'orders',
): Promise<UploadTicket[]> {
  const supabase = requireServiceClient();
  const tickets: UploadTicket[] = [];

  for (const [index, doc] of documents.entries()) {
    const contentType = contentTypeFor(doc.name);
    if (!contentType) continue;

    const path = buildStoragePath(folder, orderId, doc.name);
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);

    if (error || !data) {
      // One failed ticket must not cost the others, and never the order.
      console.error(`[documents] could not mint an upload URL for order ${orderId}:`, error);
      continue;
    }

    tickets.push({ index, name: doc.name, path, contentType, url: data.signedUrl });
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
): Promise<RegisteredDocument[]> {
  const supabase = requireServiceClient();

  // One listing per order rather than one call per path.
  const { data: objects, error } = await supabase.storage
    .from(BUCKET)
    .list(`orders/${orderId}`, { limit: MAX_FILES * 2 });

  if (error) throw new Error(`could not list uploaded documents: ${error.message}`);

  const present = new Map((objects ?? []).map((object) => [`orders/${orderId}/${object.name}`, object]));
  // purge_after is a date column — send a plain YYYY-MM-DD, not a timestamp.
  const purgeAfter = new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  // A retried confirmation — a flaky connection, an impatient second click —
  // must not record the same document twice.
  const { data: existing } = await supabase
    .from('order_documents')
    .select('storage_path')
    .eq('order_id', orderId);
  const alreadyRecorded = new Set((existing ?? []).map((row) => row.storage_path));

  const registered: RegisteredDocument[] = [];

  for (const { path, name } of documents) {
    const object = present.get(path);
    if (!object || alreadyRecorded.has(path)) continue;
    alreadyRecorded.add(path);

    // Size and type come from the object itself; only the label is the
    // sender's, because the storage key is a generated UUID and "contract.pdf"
    // is what the office needs to see in the file.
    const sizeBytes = Number(object.metadata?.size ?? 0);
    const originalName = sanitizeName(name);

    const { error: insertError } = await supabase.from('order_documents').insert({
      order_id: orderId,
      original_name: originalName,
      storage_path: path,
      mime_type: (object.metadata?.mimetype as string | undefined) ?? contentTypeFor(name),
      size_bytes: sizeBytes,
      purge_after: purgeAfter,
    });

    if (insertError) {
      console.error(`[documents] could not record ${path}:`, insertError.message);
      continue;
    }

    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, DOWNLOAD_URL_TTL_SECONDS);

    registered.push({
      originalName,
      storagePath: path,
      sizeBytes,
      downloadUrl: signed?.signedUrl ?? null,
    });
  }

  return registered;
}

/**
 * The contract pages a reader sent from /estimate, once they have landed.
 *
 * There is no table for these — a quote is a lead, and `order_documents` hangs
 * off an order — so the bucket listing is the record. Each path is checked
 * against what is actually in the folder before a link is signed, for the same
 * reason as above: a confirmation can only ever describe objects that exist.
 */
export async function signQuoteDocuments(
  leadId: string,
  documents: UploadedDocument[],
): Promise<RegisteredDocument[]> {
  const supabase = requireServiceClient();

  const { data: objects, error } = await supabase.storage
    .from(BUCKET)
    .list(`quotes/${leadId}`, { limit: MAX_FILES * 2 });

  if (error) throw new Error(`could not list uploaded contract pages: ${error.message}`);

  const present = new Map((objects ?? []).map((object) => [`quotes/${leadId}/${object.name}`, object]));
  const signed: RegisteredDocument[] = [];
  const seen = new Set<string>();

  for (const { path, name } of documents) {
    const object = present.get(path);
    if (!object || seen.has(path)) continue;
    seen.add(path);

    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, DOWNLOAD_URL_TTL_SECONDS);

    signed.push({
      originalName: sanitizeName(name),
      storagePath: path,
      sizeBytes: Number(object.metadata?.size ?? 0),
      downloadUrl: data?.signedUrl ?? null,
    });
  }

  return signed;
}

/** An order is only open for document confirmation briefly after it is created. */
export function isWithinConfirmWindow(createdAt: string): boolean {
  const created = new Date(createdAt).getTime();
  return Number.isFinite(created) && Date.now() - created < CONFIRM_WINDOW_MS;
}
