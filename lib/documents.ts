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
 * Stamped on each row as `purge_after`, and acted on when the daily purge
 * (app/api/cron/purge) is switched on: it deletes the object and its row once
 * the date passes.
 * The same 90 days is what the table's own trigger stamps when a row arrives
 * without one, so the code and the schema agree on a single number.
 *
 * The bucket is a drop box between the website and the title file, not a
 * record of the order — the office's email says to move what the file needs
 * out of it. How long the firm keeps a contract once it is in the title file
 * is a separate question for the firm and its counsel, and nothing here
 * answers it.
 */
export const RETENTION_DAYS = 90;

/**
 * How long the purge leaves a contract sent for pricing from /estimate in
 * storage, when the purge is switched on. The pages make no promise about it;
 * the environment's QUOTE_RETENTION_DAYS can set any other number.
 */
export const QUOTE_RETENTION_DAYS = 30;

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

/**
 * Whether a file's first bytes are what its extension says it is.
 *
 * The extension picks the stored content type, and a name is the one thing
 * about a file that costs nothing to fake. These files land in a title
 * agency's inbox as links, which is exactly where a disguised executable or a
 * booby-trapped document would want to be, so each one is opened at confirm
 * time and anything whose bytes disagree with its name is deleted.
 *
 * `head` is the start of the object. `tail` is its end, and only a Word file
 * needs it: a .docx is a zip, and the listing that names `[Content_Types].xml`
 * — the part that makes a zip an Office document — can sit at either end.
 */
export function contentMatches(contentType: string, head: Uint8Array, tail?: Uint8Array): boolean {
  const starts = (...bytes: number[]) => bytes.every((byte, i) => head[i] === byte);
  const ascii = (from: number, to: number) => latin1(head.subarray(from, to));

  switch (contentType) {
    case 'application/pdf':
      // Readers accept the header anywhere in the first kilobyte, and scanners
      // do sometimes put a few bytes in front of it.
      return ascii(0, 1024).includes('%PDF-');
    case 'image/jpeg':
      return starts(0xff, 0xd8, 0xff);
    case 'image/png':
      return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case 'image/heic':
      // An ISO media box: "ftyp" at offset 4, then an HEIF-family brand. An
      // iPhone photo says heic; some exporters write the generic mif1.
      return ascii(4, 8) === 'ftyp' && HEIF_BRANDS.has(ascii(8, 12));
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return (
        starts(0x50, 0x4b, 0x03, 0x04) &&
        [head, tail].some((part) => part !== undefined && latin1(part).includes('[Content_Types].xml'))
      );
    default:
      return false;
  }
}

const HEIF_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1', 'heif']);

function latin1(bytes: Uint8Array): string {
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return text;
}

/** A file as the picker hands it over — all the screening needs of a `File`. */
export interface PickedFile {
  name: string;
  size: number;
}

export interface Rejection {
  name: string;
  reason: string;
}

export interface ScreenRules {
  accepts: (filename: string) => boolean;
  /** What the picker takes, in words, for the "wrong type" reason. */
  typeLabel: string;
  maxFiles: number;
  maxFileBytes: number;
  maxTotalBytes: number;
}

/**
 * Decides which newly picked files join the list, and says why each of the
 * others did not.
 *
 * The forms used to drop a file quietly when it was a duplicate, too large or
 * one too many — and a person who picked five pages and saw four had no way to
 * know which one was missing or why. Every refusal now comes back with the
 * file's name and a reason, in the order the files were picked.
 */
export function screenFiles<T extends PickedFile>(
  current: T[],
  added: T[],
  rules: ScreenRules,
): { files: T[]; rejected: Rejection[] } {
  const files = [...current];
  const rejected: Rejection[] = [];
  let total = files.reduce((sum, file) => sum + file.size, 0);

  for (const file of added) {
    const reason = !rules.accepts(file.name)
      ? `${rules.typeLabel} only`
      : files.some((existing) => existing.name === file.name && existing.size === file.size)
        ? 'already added'
        : file.size > rules.maxFileBytes
          ? `over ${formatBytes(rules.maxFileBytes)}`
          : files.length >= rules.maxFiles
            ? `no more than ${rules.maxFiles} files`
            : total + file.size > rules.maxTotalBytes
              ? `over ${formatBytes(rules.maxTotalBytes)} in all`
              : null;

    if (reason) {
      rejected.push({ name: file.name, reason });
      continue;
    }
    files.push(file);
    total += file.size;
  }

  return { files, rejected };
}

/** Where an upload has got to: bytes sent, out of how many. */
export type UploadProgress = (sent: number, total: number) => void;

/**
 * Sends one file straight to Supabase Storage with the signed URL the server
 * minted. The bytes never touch this application.
 *
 * XMLHttpRequest rather than fetch, because it is still the only browser API
 * that reports how far an upload has got, and a 20 MB survey on a phone
 * connection is a long time to watch a counter that does not move.
 */
export function uploadWithProgress(
  ticket: { url: string; contentType: string },
  file: Blob,
  onProgress: UploadProgress,
  signal: AbortSignal,
): Promise<boolean> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve(false);
      return;
    }

    const request = new XMLHttpRequest();
    request.open('PUT', ticket.url);
    // The stored type is the one the server derived from the extension, never
    // what the browser guessed about the file.
    request.setRequestHeader('content-type', ticket.contentType);
    request.setRequestHeader('cache-control', 'max-age=3600');
    request.setRequestHeader('x-upsert', 'false');

    request.upload.onprogress = (event) => onProgress(event.loaded, event.total || file.size);
    request.onload = () => resolve(request.status >= 200 && request.status < 300);
    request.onerror = () => resolve(false);
    request.onabort = () => resolve(false);
    signal.addEventListener('abort', () => request.abort(), { once: true });

    request.send(file);
  });
}
