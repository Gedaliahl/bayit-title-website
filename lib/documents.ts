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

/**
 * Stamped on each row as `purge_after` to mark when a document becomes eligible
 * for deletion. Nothing acts on it: there is no purge job, and there is no
 * retention policy either — how long a title agency must keep a contract or a
 * payoff letter is a question for the firm and its counsel, not a default
 * inherited from a schema sketch. Until that decision exists, this is a marker
 * and the site promises nothing about it.
 */
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

/**
 * A contract sent for pricing from /estimate, which is a lead and not an
 * order. It lives in the same private bucket under its own folder, so the two
 * kinds of upload can never be confused for each other by path.
 */
export function isPathForQuote(path: string, leadId: string): boolean {
  return path.startsWith(`quotes/${leadId}/`);
}

/**
 * What /estimate will take as a contract: a PDF or a photograph of each page.
 * A Word file is not a signed contract, so it is left off the picker there
 * even though the bucket would store it.
 */
const CONTRACT_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.heic'];

export const CONTRACT_ACCEPT_ATTRIBUTE = CONTRACT_EXTENSIONS.join(',');

/** The whole contract, every page together. Matches the copy on the page. */
export const MAX_CONTRACT_TOTAL_BYTES = 25 * 1024 * 1024;

export function isContractFile(filename: string): boolean {
  return CONTRACT_EXTENSIONS.includes(extensionOf(filename));
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
