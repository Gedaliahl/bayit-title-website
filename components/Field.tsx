'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

import { formatBytes, uploadWithProgress, type Rejection } from '@/lib/documents';
import { HONEYPOT_FIELD } from '@/lib/schemas';
import { site } from '@/lib/site';

interface BaseProps {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
}

function Wrapper({
  name,
  label,
  hint,
  error,
  required,
  children,
}: BaseProps & { children: ReactNode }) {
  return (
    <div className={`field${error ? ' field--error' : ''}`}>
      <label htmlFor={name}>
        {label}
        {required ? null : <span className="field__hint"> (optional)</span>}
      </label>
      {hint ? (
        <span className="field__hint" id={`${name}-hint`}>
          {hint}
        </span>
      ) : null}
      {children}
      {/* Not an alert. A failed submit renders every error at once, and each
          one shouting over the last read as noise; focus moves to the first
          field instead, and its aria-describedby reads this with it. */}
      {error ? (
        <span className="field__error" id={`${name}-error`}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

function describedBy(name: string, hint?: string, error?: string): string | undefined {
  const ids = [hint ? `${name}-hint` : null, error ? `${name}-error` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(' ') : undefined;
}

export function TextField({
  type = 'text',
  autoComplete,
  inputMode,
  ...props
}: BaseProps & {
  type?: string;
  autoComplete?: string;
  inputMode?: 'text' | 'tel' | 'email' | 'numeric' | 'decimal';
}) {
  return (
    <Wrapper {...props}>
      <input
        id={props.name}
        name={props.name}
        type={type}
        required={props.required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={props.error ? true : undefined}
        aria-describedby={describedBy(props.name, props.hint, props.error)}
      />
    </Wrapper>
  );
}

export function TextArea(props: BaseProps & { rows?: number }) {
  return (
    <Wrapper {...props}>
      <textarea
        id={props.name}
        name={props.name}
        rows={props.rows ?? 5}
        required={props.required}
        aria-invalid={props.error ? true : undefined}
        aria-describedby={describedBy(props.name, props.hint, props.error)}
      />
    </Wrapper>
  );
}

export function SelectField({
  options,
  placeholder = 'Select…',
  ...props
}: BaseProps & { options: { value: string; label: string }[]; placeholder?: string }) {
  return (
    <Wrapper {...props}>
      <select
        id={props.name}
        name={props.name}
        required={props.required}
        defaultValue=""
        aria-invalid={props.error ? true : undefined}
        aria-describedby={describedBy(props.name, props.hint, props.error)}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Wrapper>
  );
}

/**
 * A removed file takes its button with it, and focus with the button. Focus
 * goes to the next file's remove button instead, or the one before it, or the
 * picker once the list is empty, so a keyboard reader stays where they were.
 * Read after the render that removed it, which is when the list is current.
 */
export function focusAfterRemoval(
  list: RefObject<HTMLElement | null>,
  removed: number,
  picker: RefObject<HTMLElement | null>,
) {
  requestAnimationFrame(() => {
    const buttons = Array.from(list.current?.querySelectorAll('button') ?? []);
    (buttons[removed] ?? buttons[removed - 1] ?? picker.current)?.focus();
  });
}

/**
 * Attachments. Controlled from the form rather than read off the DOM at submit
 * time, because a person who picks three files and then one more expects four —
 * a plain multiple input would replace the set.
 */
export function FileField({
  files,
  rejected,
  onAdd,
  onRemove,
  accept,
  disabled,
  ...props
}: BaseProps & {
  files: File[];
  /** Files picked but not attached, each with the reason. */
  rejected: Rejection[];
  onAdd: (added: File[]) => void;
  onRemove: (index: number) => void;
  accept: string;
  disabled?: boolean;
}) {
  const picker = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  return (
    <Wrapper {...props}>
      <input
        ref={picker}
        id={props.name}
        name={props.name}
        type="file"
        multiple
        accept={accept}
        disabled={disabled}
        aria-invalid={props.error ? true : undefined}
        aria-describedby={describedBy(props.name, props.hint, props.error)}
        onChange={(event) => {
          onAdd(Array.from(event.target.files ?? []));
          // Clear it, so picking the same file again after removing it still fires.
          event.target.value = '';
        }}
      />

      {files.length > 0 ? (
        <ul className="file-list" ref={list}>
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${index}`}>
              <span className="file-list__name">{file.name}</span>
              <span className="file-list__size">{formatBytes(file.size)}</span>
              <button
                type="button"
                className="file-list__remove"
                onClick={() => {
                  onRemove(index);
                  focusAfterRemoval(list, index, picker);
                }}
                disabled={disabled}
              >
                Remove<span className="visually-hidden"> {file.name}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <RejectedFiles rejected={rejected} />
    </Wrapper>
  );
}

/**
 * The files that were picked and not attached, by name, with the reason.
 *
 * The live region is always in the page and only its contents come and go: a
 * region that arrives already holding its text is not read out.
 */
export function RejectedFiles({ rejected }: { rejected: Rejection[] }) {
  return (
    <div className="file-rejects" role="status">
      {rejected.length > 0 ? (
        <>
          <p className="file-rejects__title">Not attached:</p>
          <ul className="file-rejects__list">
            {rejected.map((file, index) => (
              <li key={`${file.name}-${index}`}>
                <span className="file-rejects__name">{file.name}</span> — {file.reason}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

/**
 * One upload in flight: which file, how far it has got, and a way to stop.
 *
 * Only the file line is announced. The byte count changes several times a
 * second and would never let a screen reader finish a sentence; the progress
 * bar carries it for anyone who looks.
 */
export function UploadMeter({
  name,
  position,
  count,
  sent,
  total,
  onCancel,
}: {
  name: string;
  position: number;
  count: number;
  sent: number;
  total: number;
  onCancel: () => void;
}) {
  const line = `Sending ${name}${count > 1 ? ` (${position} of ${count})` : ''}`;

  // A live region that arrives already holding its text is not read out, so
  // the first file would pass in silence. The announcer mounts empty and is
  // filled a moment later; the line on screen does not wait.
  const [spoken, setSpoken] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setSpoken(line), 0);
    return () => clearTimeout(timer);
  }, [line]);

  return (
    <div className="upload-meter">
      <p className="visually-hidden" aria-live="polite">
        {spoken}
      </p>
      <p className="upload-meter__file">{line}</p>
      <progress className="upload-meter__bar" max={total || 1} value={sent} aria-label={`Upload of ${name}`} />
      <div className="upload-meter__foot">
        <span className="upload-meter__bytes">
          {formatBytes(sent)} of {formatBytes(total)}
        </span>
        <button type="button" className="upload-meter__cancel" onClick={onCancel}>
          Stop uploading
        </button>
      </div>
    </div>
  );
}

/**
 * Asks before the tab closes while files are still going up. The order itself
 * is already safe by then; the documents in flight are not.
 */
export function useLeaveWarning(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Still required by some browsers for the prompt to appear at all.
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [active]);
}

/**
 * Off-screen field. A real person never sees it; a bot fills it in.
 *
 * `new-password` is the one autocomplete value browsers reliably honor by
 * leaving a field alone. `off` is ignored by several of them, which is how the
 * old `company` field came to be filled on real orders.
 */
export function Honeypot() {
  return (
    <div className="hp" aria-hidden="true">
      <label htmlFor={HONEYPOT_FIELD}>Leave this empty</label>
      <input
        id={HONEYPOT_FIELD}
        name={HONEYPOT_FIELD}
        type="text"
        tabIndex={-1}
        autoComplete="new-password"
      />
    </div>
  );
}

/** The error list at the top of a long form, each entry a link to its field. */
export function ErrorSummary({
  errors,
  labels,
  summaryRef,
}: {
  errors: Record<string, string>;
  labels: Record<string, string>;
  summaryRef: RefObject<HTMLDivElement | null>;
}) {
  const entries = Object.entries(errors).filter(([field, message]) => message && labels[field]);
  if (entries.length === 0) return null;

  return (
    <div className="form-status form-status--error error-summary" ref={summaryRef} tabIndex={-1}>
      <p className="error-summary__title">
        {entries.length === 1 ? 'One thing needs another look:' : `${entries.length} things need another look:`}
      </p>
      <ul>
        {entries.map(([field, message]) => (
          <li key={field}>
            <a href={`#${field}`}>
              {labels[field]}: {message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * A form's field errors, and the handler that clears one the moment the
 * person starts fixing it. A message left standing over a corrected field
 * reads as though the correction did not take.
 */
export function useFieldErrors() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const clearOnInput = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    const field = (event.target as HTMLInputElement).name;
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }, []);
  return { errors, setErrors, clearOnInput };
}

/** What came back from a form endpoint. Status 0 means no answer arrived at all. */
export interface Reply<T> {
  status: number;
  body: T | null;
}

/** Longer than a normal submission ever takes, short enough that nobody gives up first. */
const SUBMIT_TIMEOUT_MS = 30_000;

/**
 * Posts a form as JSON, and never throws.
 *
 * A body is read only when the server says it is JSON. A platform timeout or
 * a proxy error answers with an HTML page, and `.json()` on that used to throw
 * straight into "could not reach the server" — which is not what happened,
 * and told the sender to try again when the order may well have landed.
 */
export async function postJson<T>(url: string, payload: unknown): Promise<Reply<T>> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS),
    });
    const isJson = (response.headers.get('content-type') ?? '').includes('application/json');
    return { status: response.status, body: isJson ? ((await response.json().catch(() => null)) as T | null) : null };
  } catch {
    return { status: 0, body: null };
  }
}

/** One signed upload the server issued for a file the browser declared, by its place in that list. */
export interface UploadTicket {
  index: number;
  name: string;
  path: string;
  contentType: string;
  url: string;
}

/** Where the uploads have got to, for the meter. */
export interface UploadState {
  name: string;
  position: number;
  count: number;
  sent: number;
  total: number;
}

/**
 * The uploads that follow a submission the server has already recorded, then
 * the confirmation that tells the office they are there. Shared by the order
 * form and the contract box, which differ only in where they confirm.
 *
 * Every file the sender picked comes back either counted as attached or named
 * in `missing` with the reason, so the success screen never implies a file
 * went that did not.
 */
export async function sendUploads({
  files,
  tickets,
  signal,
  onProgress,
  confirm,
}: {
  files: File[];
  tickets: UploadTicket[];
  signal: AbortSignal;
  onProgress: (state: UploadState) => void;
  confirm: (documents: { path: string; name: string }[]) => Promise<Reply<{ recorded?: number; rejected?: Rejection[] }>>;
}): Promise<{ attached: number; missing: Rejection[] }> {
  const ticketed = new Set(tickets.map((ticket) => ticket.index));
  const missing: Rejection[] = files
    .filter((_, index) => !ticketed.has(index))
    .map((file) => ({ name: file.name, reason: 'not accepted for upload' }));

  // One at a time: the progress stays honest and a phone on a weak connection
  // is not asked to hold ten uploads open at once.
  const uploaded: { path: string; name: string }[] = [];
  for (const [position, ticket] of tickets.entries()) {
    const file = files[ticket.index];
    if (!file) continue;
    if (signal.aborted) {
      missing.push({ name: file.name, reason: 'not sent, because the upload was stopped' });
      continue;
    }

    const state = { name: file.name, position: position + 1, count: tickets.length, sent: 0, total: file.size };
    onProgress(state);
    const ok = await uploadWithProgress(ticket, file, (sent, total) => onProgress({ ...state, sent, total }), signal);
    if (ok) uploaded.push({ path: ticket.path, name: file.name });
    else missing.push({ name: file.name, reason: signal.aborted ? 'stopped before it finished' : 'the upload failed' });
  }

  if (uploaded.length === 0) return { attached: 0, missing };

  const confirmed = await confirm(uploaded);
  if (confirmed.status < 200 || confirmed.status >= 300 || !confirmed.body) {
    missing.push(...uploaded.map((doc) => ({ name: doc.name, reason: 'uploaded, but could not be passed on' })));
    return { attached: 0, missing };
  }

  const attached = confirmed.body.recorded ?? 0;
  const refused = confirmed.body.rejected ?? [];
  missing.push(...refused);
  const unaccounted = uploaded.length - attached - refused.length;
  if (unaccounted > 0) {
    missing.push({ name: `${unaccounted} other file${unaccounted === 1 ? '' : 's'}`, reason: 'did not arrive in storage' });
  }
  return { attached, missing };
}

/**
 * Whether a reply leaves it unknown if the submission landed: no answer, or a
 * server error that did not come from our own handler. Our handler's own
 * failures are JSON and say plainly that nothing was recorded.
 */
export function outcomeUnknown(reply: Reply<unknown>): boolean {
  return reply.status === 0 || (reply.status >= 500 && reply.body === null);
}

/**
 * A form's fields as they are sent, leaving out any left blank. A select still
 * on "Select…" posts an empty string, which the server has to read as no
 * answer; leaving it out says so without making it read anything. The form is
 * checked with the blanks still in, so a required field left empty is named
 * as empty rather than as missing.
 */
export function withoutBlanks<T extends Record<string, unknown>>(fields: T): Partial<T> {
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== '')) as Partial<T>;
}

/**
 * One id per submission, kept across retries and replaced once it succeeds.
 * The server uses it to recognise a retry of something it already has.
 */
export function useSubmissionId() {
  const id = useRef<string | null>(null);
  const current = useCallback(() => {
    id.current ??= crypto.randomUUID();
    return id.current;
  }, []);
  const settle = useCallback(() => {
    id.current = null;
  }, []);
  return { current, settle };
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

interface TurnstileApi {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widget: string) => void;
  remove: (widget: string) => void;
}

let turnstileScript: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  turnstileScript ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => {
      const api = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
      if (api) resolve(api);
      else reject(new Error('Turnstile did not load'));
    };
    script.onerror = () => {
      turnstileScript = null;
      reject(new Error('Turnstile did not load'));
    };
    document.head.appendChild(script);
  });
  return turnstileScript;
}

/**
 * Cloudflare Turnstile, when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set, and
 * nothing at all when it is not: no script, no box, no token.
 *
 * A token is good for one submission, so `reset` is called after every answer
 * from the server and the widget issues a fresh one for the next try.
 */
export function useBotCheck() {
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const widget = useRef<string | null>(null);
  const api = useRef<TurnstileApi | null>(null);
  const [token, setToken] = useState('');
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !box) return;
    let cancelled = false;

    loadTurnstile()
      .then((turnstile) => {
        if (cancelled) return;
        api.current = turnstile;
        widget.current = turnstile.render(box, {
          sitekey: TURNSTILE_SITE_KEY,
          // The normal widget is a fixed 300px, wider than the form on a small
          // phone; the compact one is 150px.
          size: box.clientWidth < 300 ? 'compact' : 'normal',
          'response-field': false,
          callback: (value: string) => setToken(value),
          'expired-callback': () => setToken(''),
          'error-callback': () => setToken(''),
        });
      })
      .catch(() => {
        // Blocked by a content blocker, or offline. The server will not take
        // the form without a token, so the form says so rather than asking
        // the sender to wait for a box that is never coming.
        if (!cancelled) setUnavailable(true);
      });

    return () => {
      cancelled = true;
      if (widget.current) api.current?.remove(widget.current);
      widget.current = null;
    };
  }, [box]);

  const reset = useCallback(() => {
    setToken('');
    if (widget.current) api.current?.reset(widget.current);
  }, []);

  return { enabled: Boolean(TURNSTILE_SITE_KEY), token, unavailable, reset, attach: setBox };
}

/** Said when the check cannot load at all, which leaves the sender no way to send. */
export const BOT_CHECK_BLOCKED =
  `The check above the button did not load, which a content blocker can cause. Allow ` +
  `challenges.cloudflare.com and reload the page, or email ${site.ordersEmail} or call ${site.phoneDisplay}.`;

export function BotCheck({ enabled, attach }: { enabled: boolean; attach: (box: HTMLDivElement | null) => void }) {
  if (!enabled) return null;
  return <div className="bot-check" ref={attach} />;
}
