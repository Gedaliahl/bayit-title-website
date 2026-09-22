'use client';

import { useId, useState } from 'react';

import { UPLOAD } from '@/content/estimate';
import {
  CONTRACT_ACCEPT_ATTRIBUTE,
  MAX_CONTRACT_TOTAL_BYTES,
  MAX_FILES,
  formatBytes,
  isContractFile,
} from '@/lib/documents';
import { Honeypot } from '@/components/Field';

interface UploadTicket {
  index: number;
  name: string;
  path: string;
  contentType: string;
  url: string;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  /** The request is already with the office; only the pages are in flight. */
  | { kind: 'uploading'; done: number; total: number }
  | { kind: 'sent'; count: number; attached: number; email: string; willCall: boolean; firstName: string }
  | { kind: 'failed'; message: string };

/** Sends one page straight to storage with the signed URL the server minted. */
async function uploadOne(ticket: UploadTicket, file: File): Promise<boolean> {
  try {
    const response = await fetch(ticket.url, {
      method: 'PUT',
      headers: {
        'content-type': ticket.contentType,
        'cache-control': 'max-age=3600',
        'x-upsert': 'false',
      },
      body: file,
    });
    return response.ok;
  } catch {
    return false;
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The third way in: the contract itself, sent to the office for the exact
 * figure. The form asks for the least it can — the file, a name, an address to
 * write back to — and says at every step what will happen to what is sent.
 */
export function UploadPane({ hidden }: { hidden: boolean }) {
  const id = useId();
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState(UPLOAD.role.options[0].value);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const busy = status.kind === 'sending' || status.kind === 'uploading';
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

  /** De-duplicated by name and size, PDFs and photographs only. */
  function addFiles(list: FileList | File[] | null) {
    const incoming = Array.from(list ?? []);
    const readable = incoming.filter((file) => isContractFile(file.name));
    const next = [...files];
    for (const file of readable) {
      if (next.length >= MAX_FILES) break;
      if (!next.some((existing) => existing.name === file.name && existing.size === file.size)) {
        next.push(file);
      }
    }
    setFiles(next);
    setDragging(false);

    const total = next.reduce((sum, file) => sum + file.size, 0);
    if (total > MAX_CONTRACT_TOTAL_BYTES) setError(UPLOAD.errors.tooLarge);
    else if (incoming.length > 0 && readable.length === 0) setError(UPLOAD.errors.notReadable);
    else if (readable.length > 0) setError('');
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, position) => position !== index));
    setError('');
  }

  function reset() {
    setFiles([]);
    setError('');
    setStatus({ kind: 'idle' });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    // The same order the page's copy describes: the file, its size, the
    // person, the address to write back to.
    if (files.length === 0) return setError(UPLOAD.errors.noFiles);
    if (totalBytes > MAX_CONTRACT_TOTAL_BYTES) return setError(UPLOAD.errors.tooLarge);
    if (!name.trim()) return setError(UPLOAD.errors.noName);
    if (!EMAIL.test(email.trim())) return setError(UPLOAD.errors.badEmail);

    setError('');
    setStatus({ kind: 'sending' });

    const company = (new FormData(event.currentTarget).get('company') as string | null) ?? '';

    let body: { lead_id?: string; uploads?: UploadTicket[]; error?: string; errors?: Record<string, string> };
    try {
      const response = await fetch('/api/contract-quote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          full_name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          role,
          message: note.trim() || undefined,
          page_path: '/estimate',
          documents: files.map((file) => ({ name: file.name, size: file.size })),
          company,
        }),
      });
      body = await response.json();

      if (!response.ok) {
        const message = body.errors ? Object.values(body.errors)[0] : body.error;
        setStatus({ kind: 'idle' });
        setError(message || UPLOAD.errors.failed);
        return;
      }
    } catch {
      setStatus({ kind: 'idle' });
      setError(UPLOAD.errors.failed);
      return;
    }

    const tickets = body.uploads ?? [];
    const leadId = body.lead_id;
    const done = (attached: number) =>
      setStatus({
        kind: 'sent',
        count: files.length,
        attached,
        email: email.trim(),
        willCall: phone.trim().length > 0,
        firstName: name.trim().split(/\s+/)[0] ?? '',
      });

    // Past this line the office has the request. Nothing that follows may
    // present itself as a failed request.
    if (tickets.length === 0 || !leadId) return done(0);

    setStatus({ kind: 'uploading', done: 0, total: tickets.length });

    // One at a time, so the count stays honest and a phone on a weak
    // connection is not asked to hold every page open at once.
    const uploaded: { path: string; name: string }[] = [];
    for (const [position, ticket] of tickets.entries()) {
      const file = files[ticket.index];
      if (file && (await uploadOne(ticket, file))) uploaded.push({ path: ticket.path, name: file.name });
      setStatus({ kind: 'uploading', done: position + 1, total: tickets.length });
    }

    let attached = 0;
    if (uploaded.length > 0) {
      try {
        const response = await fetch('/api/contract-quote/documents', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ lead_id: leadId, documents: uploaded }),
        });
        const result = await response.json();
        attached = response.ok ? (result.recorded ?? 0) : 0;
      } catch {
        attached = 0;
      }
    }

    done(attached);
  }

  const statusText =
    error ||
    (status.kind === 'uploading'
      ? UPLOAD.uploading(status.done, status.total)
      : status.kind === 'sending'
        ? UPLOAD.sending
        : UPLOAD.status);

  return (
    <div className="calc-grid" hidden={hidden}>
      <form className="form-card" onSubmit={submit} noValidate>
        {status.kind === 'sent' ? (
          <div className="received">
            <p className="received__eyebrow">{UPLOAD.sent.eyebrow}</p>
            <h3 className="received__title">{UPLOAD.sent.title(status.firstName)}</h3>
            <p className="received__body">{UPLOAD.sent.body(status.attached, status.email, status.willCall)}</p>
            {/* Never let a silent upload failure pass as success. */}
            {status.attached < status.count ? (
              <p className="received__body">{UPLOAD.sent.missing(status.count - status.attached)}</p>
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
            <div className="field">
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
                  id={`${id}-contract`}
                  type="file"
                  multiple
                  accept={CONTRACT_ACCEPT_ATTRIBUTE}
                  aria-describedby={`${id}-contract-hint`}
                  disabled={busy}
                  className="visually-hidden"
                  onChange={(event) => {
                    addFiles(event.target.files);
                    // Clear it, so the same file can be picked again after being removed.
                    event.target.value = '';
                  }}
                />
              </label>
              {files.length > 0 ? (
                <ul className="contract-files">
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
            </div>

            <div className="two-up">
              <div className="field">
                <label htmlFor={`${id}-name`}>{UPLOAD.name.label}</label>
                <input
                  id={`${id}-name`}
                  autoComplete="name"
                  value={name}
                  disabled={busy}
                  onChange={(event) => setName(event.target.value)}
                />
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
              <div className="field">
                <label htmlFor={`${id}-email`}>{UPLOAD.email.label}</label>
                <span className="field__hint" id={`${id}-email-hint`}>
                  {UPLOAD.email.hint}
                </span>
                <input
                  id={`${id}-email`}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  aria-describedby={`${id}-email-hint`}
                  value={email}
                  disabled={busy}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor={`${id}-phone`}>
                  {UPLOAD.phone.label} <span className="field__optional">{UPLOAD.phone.optional}</span>
                </label>
                <span className="field__hint" id={`${id}-phone-hint`}>
                  {UPLOAD.phone.hint}
                </span>
                <input
                  id={`${id}-phone`}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  aria-describedby={`${id}-phone-hint`}
                  value={phone}
                  disabled={busy}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor={`${id}-note`}>
                {UPLOAD.note.label} <span className="field__optional">{UPLOAD.note.optional}</span>
              </label>
              <span className="field__hint" id={`${id}-note-hint`}>
                {UPLOAD.note.hint}
              </span>
              <textarea
                id={`${id}-note`}
                rows={3}
                aria-describedby={`${id}-note-hint`}
                value={note}
                disabled={busy}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>

            <Honeypot />

            <div className="form-card__foot">
              <span
                className={error ? 'form-card__status form-card__status--error' : 'form-card__status'}
                aria-live="polite"
              >
                {statusText}
              </span>
              <button type="submit" className="btn btn--dark btn--send" disabled={busy}>
                {busy ? UPLOAD.sending : UPLOAD.submit}
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
