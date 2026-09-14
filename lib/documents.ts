// What may be attached to an order, and what it is called once it lands.
//
// Deliberately free of server imports: the same limits run in the browser, so a
// file that is too large is refused before anyone waits on an upload. The
// server applies them again in the Route Handler, which is the actual gate —
// see lib/document-storage.ts.

export const BUCKET = 'order-documents';

/** Deliberately modest. These are closing documents, not media. */
export const MAX_FILES = 10;
/** Matches `file_size_limit` on the bucket, which rejects anything larger. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 60 * 1024 * 1024;

/**
 * What a title file actually receives: contracts, surveys, payoff letters,
 * estoppels, trust and entity paperwork, and photographs of documents.
 *
 * Keyed by extension rather than by the browser's declared MIME type, because
 * the declared type is attacker-controlled and inconsistent across platforms.
 * The extension decides, and the stored content type is set from this table —
 * never from what the client claimed.
 *
 * The values mirror `allowed_mime_types` on the `order-documents` bucket, which
 * is where the rule is actually enforced. Adding one here without adding it
 * there buys the sender a picker that accepts the file and an upload that fails.
 */
const ACCEPTED: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.heic': 'image/heic',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

/** For the file input's `accept` attribute, so the picker filters too. */
export const ACCEPT_ATTRIBUTE = Object.keys(ACCEPTED).join(',');
export const ACCEPTED_LABEL = 'PDF, JPG, PNG, HEIC or Word (.docx)';

/** Documents are purged on this schedule unless the office moves them into the file. */
export const RETENTION_DAYS = 90;

export function extensionOf(filename: string): string {
  const match = /\.[A-Za-z0-9]+$/.exec(filename.trim());
  return match ? match[0].toLowerCase() : '';
}

export function contentTypeFor(filename: string): string | null {
  return ACCEPTED[extensionOf(filename)] ?? null;
}

/**
 * The name shown to the office. Only ever a label: it is stored in a column,
 * never used to build a path, so it cannot traverse or collide.
 */
export function sanitizeName(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? 'document';
  return base.replace(/[^\w.\- ]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 120) || 'document';
}

export function isPathForOrder(path: string, orderId: string): boolean {
  return path.startsWith(`orders/${orderId}/`);
}

/** Sizes as a person reads them, for the file list under the picker. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const mb = bytes / (1024 * 1024);
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
}

export interface DeclaredDocument {
  name: string;
  size: number;
}
