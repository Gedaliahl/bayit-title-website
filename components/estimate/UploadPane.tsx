'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { track } from '@vercel/analytics';

import { UPLOAD } from '@/content/estimate';
import {
  CONTRACT_ACCEPT_ATTRIBUTE,
  MAX_CONTRACT_TOTAL_BYTES,
  MAX_FILES,
  MAX_FILE_BYTES,
  formatBytes,
  isContractFile,
  screenFiles,
  type Rejection,
} from '@/lib/documents';
import { HONEYPOT_FIELD } from '@/lib/honeypot';
import {
  BOT_CHECK_BLOCKED,
  BotCheck,
  focusAfterRemoval,
  Honeypot,
  outcomeUnknown,
  postJson,
  RejectedFiles,
  sendUploads,
  UploadMeter,
  type UploadTicket,
  useBotCheck,
  useLeaveWarning,
  useSubmissionId,
  withoutBlanks,
} from '@/components/Field';
import { useErrorFocus } from '@/components/useErrorFocus';

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  /** The request is already with the office; only the pages are in flight. */
  | { kind: 'uploading'; name: string; position: number; count: number; sent: number; total: number }
  | { kind: 'sent'; attached: number; missing: Rejection[]; email: string; willCall: boolean; firstName: string };

const SCREEN_RULES = {
  accepts: isContractFile,
  typeLabel: UPLOAD.contract.typeLabel,
  maxFiles: MAX_FILES,
  maxFileBytes: MAX_FILE_BYTES,
  maxTotalBytes: MAX_CONTRACT_TOTAL_BYTES,
};

/**
 * The schema is fetched when the pane is first opened, not with the page. It
 * brings zod, 36KB compressed, and most visits to /estimate never open this
 * pane; loaded with the page it was the largest thing the estimate page sent
 * a phone before its first paint. Opening the pane starts the download, so it
 * is in hand well before anyone can fill the form in and press send.
 */
const loadSchemas = () => import('@/lib/schemas');

/**
 * The third way in: the contract itself, sent to the office for the exact
 * figure. The form asks for the least it can — the file, a name, an address to
 * write back to — and says at every step what will happen to what is sent.
 */
export function UploadPane({ hidden }: { hidden: boolean }) {
  const id = useId();
  const [files, setFiles] = useState<File[]>([]);
  const [rejected, setRejected] = useState<Rejection[]>([]);
  const [dragging, setDragging] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState(UPLOAD.role.options[0].value);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const { formRef, reportFailure } = useErrorFocus();
  const submission = useSubmissionId();
  const botCheck = useBotCheck();
  const uploads = useRef<AbortController | null>(null);
  const successRef = useRef<HTMLHeadingElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const fileList = useRef<HTMLUListElement>(null);
  /** Waiting on the schema: `busy` is not set yet, and a second press must not send twice. */
  const checking = useRef(false);

  const busy = status.kind === 'sending' || status.kind === 'uploading';
  useLeaveWarning(status.kind === 'uploading');

  useEffect(() => {
    if (status.kind === 'sent') successRef.current?.focus();
  }, [status.kind]);

  useEffect(() => {
    // A failed fetch is retried on send, and failing there too is covered.
    if (!hidden) loadSchemas().catch(() => {});
  }, [hidden]);

  /** Every page that is not added is named, with the reason. */
  function addFiles(list: FileList | File[] | null) {
    const screened = screenFiles(files, Array.from(list ?? []), SCREEN_RULES);
    setFiles(screened.files);
    setRejected(screened.rejected);
    setDragging(false);
    if (screened.files.length > 0) clearError('documents');
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, position) => position !== index));
    setRejected([]);
    focusAfterRemoval(fileList, index, picker);
  }

  function clearError(field: string) {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  /** "Send another": the form comes back, and focus goes to where it starts. */
  function reset() {
    setFiles([]);
    setRejected([]);
    setErrors({});
    setStatus({ kind: 'idle' });
    requestAnimationFrame(() => picker.current?.focus());
  }

  function fail(found: Record<string, string>, outcome: string) {
    setErrors(found);
    setStatus({ kind: 'idle' });
    reportFailure();
    track('form_submit', { form: 'contract', outcome });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || checking.current) return;

    const honeypot = (new FormData(event.currentTarget).get(HONEYPOT_FIELD) as string | null) ?? '';
    const payload = {
      full_name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      role,
      message: note.trim() || undefined,
      page_path: '/estimate',
      documents: files.map((file) => ({ name: file.name, size: file.size })),
      [HONEYPOT_FIELD]: honeypot,
    };

    // The same schema the server runs; its messages are the page's own. The
    // file comes first because it is the first thing on the form. If the
    // schema could not be fetched, the request goes without the early check:
    // the server runs the same one and answers 422 with the same messages.
    checking.current = true;
    const schemas = await loadSchemas().catch(() => null);
    checking.current = false;
    const checked = schemas?.contractQuoteSchema.safeParse(payload);
    if (schemas && checked && !checked.success) return fail(schemas.fieldErrors(checked.error), 'invalid');
    if (botCheck.enabled && !botCheck.token) {
      return fail({ form: botCheck.unavailable ? BOT_CHECK_BLOCKED : UPLOAD.errors.botCheck }, 'bot_check');
    }

    setErrors({});
    setStatus({ kind: 'sending' });

    const reply = await postJson<{
      lead_id?: string;
      uploads?: UploadTicket[];
      error?: string;
      errors?: Record<string, string>;
    }>('/api/contract-quote', {
      ...withoutBlanks(payload),
      submission_id: submission.current(),
      turnstile_token: botCheck.token || undefined,
    });
    botCheck.reset();

    if (outcomeUnknown(reply)) return fail({ form: UPLOAD.errors.noAnswer }, 'no_answer');
    if (reply.status >= 400 || !reply.body) {
      const found = reply.body?.errors ?? { form: reply.body?.error ?? UPLOAD.errors.failed };
      return fail(found, reply.status === 422 ? 'invalid' : 'refused');
    }

    // Past this line the office has the request. Nothing that follows may
    // present itself as a failed request.
    submission.settle();
    track('form_submit', { form: 'contract', outcome: 'sent' });

    const tickets = reply.body.uploads ?? [];
    const leadId = reply.body.lead_id;
    let attached = 0;
    let missing: Rejection[] = files.map((file) => ({ name: file.name, reason: 'not accepted for upload' }));
    if (leadId) {
      const controller = new AbortController();
      uploads.current = controller;
      ({ attached, missing } = await sendUploads({
        files,
        tickets,
        signal: controller.signal,
        onProgress: (state) => setStatus({ kind: 'uploading', ...state }),
        confirm: (documents) => postJson('/api/contract-quote/documents', { lead_id: leadId, documents }),
      }));
      uploads.current = null;
    }

    if (missing.length > 0) track('upload_failed', { form: 'contract', count: missing.length });
    setStatus({
      kind: 'sent',
      attached,
      missing,
      email: payload.email,
      willCall: payload.phone !== undefined,
      firstName: payload.full_name.split(/\s+/)[0] ?? '',
    });
  }

  const formError = errors.form;
  const statusText =
    formError ||
    (status.kind === 'uploading'
      ? UPLOAD.uploadingNote
      : status.kind === 'sending'
        ? UPLOAD.sending
        : UPLOAD.status);

  const describe = (field: string, hint?: string) =>
    [hint, errors[field] ? `${id}-${field}-error` : null].filter(Boolean).join(' ') || undefined;

  const fieldError = (field: string) =>
    errors[field] ? (
      <span className="field__error" id={`${id}-${field}-error`}>
        {errors[field]}
      </span>
    ) : null;

  return (
    <div className="calc-grid" hidden={hidden}>
      <form className="form-card" onSubmit={submit} noValidate ref={formRef}>
        {status.kind === 'sent' ? (
          <div className="received">
            <p className="received__eyebrow">{UPLOAD.sent.eyebrow}</p>
            <h3 className="received__title" ref={successRef} tabIndex={-1}>
              {UPLOAD.sent.title(status.firstName)}
            </h3>
            <p className="received__body">{UPLOAD.sent.body(status.attached, status.email, status.willCall)}</p>
            {/* Never let a silent upload failure pass as success. */}
            {status.missing.length > 0 ? (
              <>
                <p className="received__body">{UPLOAD.sent.missing(status.missing.length)}</p>
                <ul className="received__list">
                  {status.missing.map((doc, index) => (
                    <li key={`${doc.name}-${index}`}>
                      {doc.name} — {doc.reason}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <p className="received__again">
              {UPLOAD.sent.wrongFile}{' '}
              <button type="button" className="linkish" onClick={reset}>
                {UPLOAD.sent.again}
              </button>{' '}
              {UPLOAD.sent.orCall}
            </p>
          </div>
        ) : (
          <>
            <div className={errors.documents ? 'field field--error' : 'field'}>
              <span className="field__label">{UPLOAD.contract.label}</span>
              <span className="field__hint" id={`${id}-contract-hint`}>
                {UPLOAD.contract.hint}
              </span>
              <label
                htmlFor={`${id}-contract`}
                className={dragging ? 'drop drop--active' : 'drop'}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!dragging) setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  addFiles(event.dataTransfer.files);
                }}
              >
                <span className="drop__title">
                  {files.length > 0
                    ? UPLOAD.contract.ready(files.length)
                    : dragging
                      ? UPLOAD.contract.dropActive
                      : UPLOAD.contract.dropTitle}
                </span>
                <span className="drop__sub">
                  {files.length > 0 ? UPLOAD.contract.dropSubMore : UPLOAD.contract.dropSub}
                </span>
                <input
                  ref={picker}
                  id={`${id}-contract`}
                  name="documents"
                  type="file"
                  multiple
                  required
                  accept={CONTRACT_ACCEPT_ATTRIBUTE}
                  aria-invalid={errors.documents ? true : undefined}
                  aria-describedby={describe('documents', `${id}-contract-hint`)}
                  disabled={busy}
                  className="visually-hidden"
                  onChange={(event) => {
                    addFiles(event.target.files);
                    // Clear it, so the same file can be picked again after being removed.
                    event.target.value = '';
                  }}
                />
              </label>
              {fieldError('documents')}
              {files.length > 0 ? (
                <ul className="contract-files" ref={fileList}>
                  {files.map((file, index) => (
                    <li key={`${file.name}-${file.size}`}>
                      <span className="contract-files__name">{file.name}</span>
                      <span className="contract-files__size">{formatBytes(file.size)}</span>
                      <button
                        type="button"
                        className="contract-files__remove"
                        aria-label={UPLOAD.contract.remove(file.name)}
                        disabled={busy}
                        onClick={() => removeFile(index)}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <RejectedFiles rejected={rejected} />
            </div>

            <div className="two-up">
              <div className={errors.full_name ? 'field field--error' : 'field'}>
                <label htmlFor={`${id}-name`}>{UPLOAD.name.label}</label>
                <input
                  id={`${id}-name`}
                  name="full_name"
                  autoComplete="name"
                  required
                  aria-invalid={errors.full_name ? true : undefined}
                  aria-describedby={describe('full_name')}
                  value={name}
                  disabled={busy}
                  onChange={(event) => {
                    setName(event.target.value);
                    clearError('full_name');
                  }}
                />
                {fieldError('full_name')}
              </div>
              <div className="field">
                <label htmlFor={`${id}-role`}>{UPLOAD.role.label}</label>
                <select
                  id={`${id}-role`}
                  value={role}
                  disabled={busy}
                  onChange={(event) => setRole(event.target.value)}
                >
                  {UPLOAD.role.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="two-up">
              <div className={errors.email ? 'field field--error' : 'field'}>
                <label htmlFor={`${id}-email`}>{UPLOAD.email.label}</label>
                <span className="field__hint" id={`${id}-email-hint`}>
                  {UPLOAD.email.hint}
                </span>
                <input
                  id={`${id}-email`}
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  aria-invalid={errors.email ? true : undefined}
                  aria-describedby={describe('email', `${id}-email-hint`)}
                  value={email}
                  disabled={busy}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    clearError('email');
                  }}
                />
                {fieldError('email')}
              </div>
              <div className={errors.phone ? 'field field--error' : 'field'}>
                <label htmlFor={`${id}-phone`}>
                  {UPLOAD.phone.label} <span className="field__optional">{UPLOAD.phone.optional}</span>
                </label>
                <span className="field__hint" id={`${id}-phone-hint`}>
                  {UPLOAD.phone.hint}
                </span>
                <input
                  id={`${id}-phone`}
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  aria-invalid={errors.phone ? true : undefined}
                  aria-describedby={describe('phone', `${id}-phone-hint`)}
                  value={phone}
                  disabled={busy}
                  onChange={(event) => {
                    setPhone(event.target.value);
                    clearError('phone');
                  }}
                />
                {fieldError('phone')}
              </div>
            </div>

            <div className={errors.message ? 'field field--error' : 'field'}>
              <label htmlFor={`${id}-note`}>
                {UPLOAD.note.label} <span className="field__optional">{UPLOAD.note.optional}</span>
              </label>
              <span className="field__hint" id={`${id}-note-hint`}>
                {UPLOAD.note.hint}
              </span>
              <textarea
                id={`${id}-note`}
                name="message"
                rows={3}
                aria-invalid={errors.message ? true : undefined}
                aria-describedby={describe('message', `${id}-note-hint`)}
                value={note}
                disabled={busy}
                onChange={(event) => {
                  setNote(event.target.value);
                  clearError('message');
                }}
              />
              {fieldError('message')}
            </div>

            <Honeypot />

            <BotCheck enabled={botCheck.enabled} attach={botCheck.attach} />

            {status.kind === 'uploading' ? (
              <UploadMeter
                name={status.name}
                position={status.position}
                count={status.count}
                sent={status.sent}
                total={status.total}
                onCancel={() => uploads.current?.abort()}
              />
            ) : null}

            <div className="form-card__foot">
              <span
                className={formError ? 'form-card__status form-card__status--error' : 'form-card__status'}
                aria-live="polite"
                tabIndex={formError ? -1 : undefined}
              >
                {statusText}
              </span>
              <button type="submit" className="btn btn--dark btn--send" disabled={busy}>
                {status.kind === 'uploading'
                  ? UPLOAD.uploading(status.position, status.count)
                  : busy
                    ? UPLOAD.sending
                    : UPLOAD.submit}
              </button>
            </div>
          </>
        )}
      </form>

      <aside className="verdict figure-card">
        <div className="verdict__cap">
          <p className="verdict__eyebrow figure-card__eyebrow">{UPLOAD.aside.eyebrow}</p>
          <p className="verdict__headline">{UPLOAD.aside.title}</p>
          <p className="figure-card__sub">{UPLOAD.aside.sub}</p>
        </div>
        <div className="figure-card__body">
          {UPLOAD.aside.sections.map((section) => (
            <section className="figure-group" key={section.title}>
              <h3 className="figure-group__title">{section.title}</h3>
              <p className="figure-group__body">{section.body}</p>
            </section>
          ))}
          <section className="figure-group figure-group--last">
            <h3 className="figure-group__title">{UPLOAD.aside.file.title}</h3>
            <p className="figure-group__body">
              {UPLOAD.aside.file.body} <a href="#privacy">{UPLOAD.aside.file.more}</a>
            </p>
          </section>
        </div>
      </aside>
    </div>
  );
}
