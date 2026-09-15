'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { TextField, TextArea, SelectField, FileField, Honeypot } from './Field';
import { useErrorFocus } from './useErrorFocus';
import {
  ACCEPT_ATTRIBUTE,
  ACCEPTED_LABEL,
  MAX_FILES,
  MAX_FILE_BYTES,
  MAX_TOTAL_BYTES,
  contentTypeFor,
  formatBytes,
} from '@/lib/documents';
import { site } from '@/lib/site';

interface CountyOption {
  value: string;
  label: string;
}

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
  /** The order is already saved by this point; only the documents are in flight. */
  | { kind: 'uploading'; done: number; total: number }
  | { kind: 'sent'; reference: string; attached: number; failed: number }
  | { kind: 'failed'; message: string };

/**
 * Sends one file straight to Supabase Storage with the signed URL the server
 * minted. The bytes never touch this application.
 */
async function uploadOne(ticket: UploadTicket, file: File): Promise<boolean> {
  try {
    const response = await fetch(ticket.url, {
      method: 'PUT',
      headers: {
        // The stored type is the one the server derived from the extension,
        // never what the browser guessed about the file.
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

export function OrderForm({ counties }: { counties: CountyOption[] }) {
  const pathname = usePathname();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<File[]>([]);
  const { formRef, reportFailure } = useErrorFocus();

  const busy = status.kind === 'sending' || status.kind === 'uploading';

  /**
   * The same limits the Route Handler enforces, applied here so a file that
   * will be refused is refused now rather than after an upload.
   */
  function addFiles(added: File[]) {
    const next = [...files];
    const rejected: string[] = [];

    for (const file of added) {
      if (next.length >= MAX_FILES) {
        rejected.push(`${file.name} — no more than ${MAX_FILES} documents`);
        continue;
      }
      if (contentTypeFor(file.name) === null) {
        rejected.push(`${file.name} — ${ACCEPTED_LABEL} only`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        rejected.push(`${file.name} — over ${formatBytes(MAX_FILE_BYTES)}`);
        continue;
      }
      const total = next.reduce((sum, existing) => sum + existing.size, file.size);
      if (total > MAX_TOTAL_BYTES) {
        rejected.push(`${file.name} — over ${formatBytes(MAX_TOTAL_BYTES)} in total`);
        continue;
      }
      next.push(file);
    }

    setFiles(next);
    setErrors((current) => ({
      ...current,
      documents: rejected.length > 0 ? `Not attached: ${rejected.join('; ')}.` : '',
    }));
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: 'sending' });
    setErrors({});

    const form = new FormData(event.currentTarget);
    // The file input is controlled in React state; everything else comes off
    // the form, and the manifest describes the files without sending them.
    form.delete('documents');
    const payload = Object.fromEntries(form.entries());
    const manifest = files.map((file) => ({ name: file.name, size: file.size }));

    let body: {
      reference?: string;
      order_id?: string;
      uploads?: UploadTicket[];
      error?: string;
      errors?: Record<string, string>;
    };

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, page_path: pathname, documents: manifest }),
      });

      body = await response.json();

      if (response.status === 422 && body.errors) {
        setErrors(body.errors);
        setStatus({ kind: 'failed', message: 'Some details need another look.' });
        reportFailure();
        return;
      }

      if (!response.ok) {
        setStatus({ kind: 'failed', message: body.error ?? 'Something went wrong.' });
        reportFailure();
        return;
      }
    } catch {
      setStatus({
        kind: 'failed',
        message: `We could not reach the server. Email ${site.ordersEmail} or call ${site.phoneDisplay}.`,
      });
      reportFailure();
      return;
    }

    const reference = body.reference ?? '';
    const tickets = body.uploads ?? [];

    // Past this line the order is recorded. Nothing that follows may present
    // itself as a failed order, because the office already has it.
    if (tickets.length === 0 || !body.order_id) {
      setStatus({ kind: 'sent', reference, attached: 0, failed: files.length });
      return;
    }

    setStatus({ kind: 'uploading', done: 0, total: tickets.length });

    // One at a time: the progress count stays honest and a phone on a weak
    // connection is not asked to hold ten uploads open at once.
    const uploaded: { path: string; name: string }[] = [];
    for (const [position, ticket] of tickets.entries()) {
      const file = files[ticket.index];
      if (file && (await uploadOne(ticket, file))) {
        uploaded.push({ path: ticket.path, name: file.name });
      }
      setStatus({ kind: 'uploading', done: position + 1, total: tickets.length });
    }

    let attached = 0;
    if (uploaded.length > 0) {
      try {
        const response = await fetch('/api/orders/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: body.order_id, documents: uploaded }),
        });
        const result = await response.json();
        attached = response.ok ? (result.recorded ?? 0) : 0;
      } catch {
        attached = 0;
      }
    }

    setStatus({ kind: 'sent', reference, attached, failed: files.length - attached });
  }

  if (status.kind === 'sent') {
    return (
      <div className="form-status form-status--ok" role="status">
        <p style={{ marginBottom: '0.5rem' }}>
          <strong>Order received{status.reference ? ` — ${status.reference}` : ''}.</strong>
        </p>
        {status.attached > 0 ? (
          <p style={{ marginBottom: '0.5rem' }}>
            {status.attached} document{status.attached === 1 ? '' : 's'} attached to the file.
          </p>
        ) : null}
        {/* Never let a silent upload failure pass as success: the office would
            be waiting on a document nobody sent. */}
        {status.failed > 0 ? (
          <p style={{ marginBottom: '0.5rem' }}>
            {status.failed} document{status.failed === 1 ? '' : 's'} did not upload. The order is
            recorded either way — reply to the confirmation email with {status.failed === 1 ? 'it' : 'them'}.
          </p>
        ) : null}
        <p style={{ margin: 0 }}>
          We will confirm by email and tell you what the search turns up.
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      {status.kind === 'failed' ? (
        // tabIndex so focus can land here when no single field is at fault.
        <p className="form-status form-status--error" role="alert" tabIndex={-1}>
          {status.message}
        </p>
      ) : null}

      <fieldset>
        <legend>Who is opening this order</legend>
        <div className="field-row">
          <TextField
            name="ordered_by_name"
            label="Your name"
            required
            autoComplete="name"
            error={errors.ordered_by_name}
          />
          <TextField
            name="ordered_by_role"
            label="Your role"
            hint="Agent, lender, buyer, seller, attorney"
            error={errors.ordered_by_role}
          />
        </div>
        <div className="field-row">
          <TextField
            name="ordered_by_email"
            label="Email"
            type="email"
            inputMode="email"
            required
            autoComplete="email"
            error={errors.ordered_by_email}
          />
          <TextField
            name="ordered_by_phone"
            label="Phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            error={errors.ordered_by_phone}
          />
        </div>
      </fieldset>

      <fieldset>
        <legend>The property</legend>
        <TextField
          name="property_address"
          label="Property address"
          required
          hint="Street, city and ZIP. If there is no address yet, give the legal description or folio."
          error={errors.property_address}
        />
        <div className="field-row">
          <SelectField
            name="county_slug"
            label="County"
            options={counties}
            error={errors.county_slug}
          />
          <TextField
            name="parcel_id"
            label="Parcel or folio number"
            error={errors.parcel_id}
          />
        </div>
      </fieldset>

      <fieldset>
        <legend>The transaction</legend>
        <div className="field-row">
          <SelectField
            name="transaction_type"
            label="Type"
            options={[
              { value: 'purchase', label: 'Purchase' },
              { value: 'refinance', label: 'Refinance' },
              { value: 'cash-purchase', label: 'Cash purchase' },
              { value: 'construction', label: 'Construction' },
              { value: 'commercial', label: 'Commercial' },
              { value: 'other', label: 'Something else' },
            ]}
            error={errors.transaction_type}
          />
          <SelectField
            name="closing_method"
            label="Preferred signing"
            options={site.closingMethods.map((method) => ({ value: method, label: method }))}
            error={errors.closing_method}
          />
        </div>
        <div className="field-row">
          <TextField
            name="purchase_price"
            label="Purchase price"
            inputMode="decimal"
            error={errors.purchase_price}
          />
          <TextField
            name="loan_amount"
            label="Loan amount"
            inputMode="decimal"
            error={errors.loan_amount}
          />
        </div>
        <div className="field-row">
          <TextField
            name="closing_date_target"
            label="Target closing date"
            type="date"
            error={errors.closing_date_target}
          />
          <TextField name="lender_name" label="Lender" error={errors.lender_name} />
        </div>
        <div className="field-row">
          <TextField name="buyer_name" label="Buyer" error={errors.buyer_name} />
          <TextField name="seller_name" label="Seller" error={errors.seller_name} />
        </div>
        <TextField
          name="lender_contact"
          label="Lender contact"
          hint="Name and email of the loan officer or processor"
          error={errors.lender_contact}
        />
      </fieldset>

      <fieldset>
        <legend>Documents</legend>
        <FileField
          name="documents"
          label="Attach anything we should start from"
          hint={`Contract, survey, payoff letter, estoppel, trust or entity paperwork. ${ACCEPTED_LABEL}, up to ${MAX_FILES} files and ${formatBytes(MAX_FILE_BYTES)} each.`}
          accept={ACCEPT_ATTRIBUTE}
          files={files}
          onAdd={addFiles}
          onRemove={removeFile}
          disabled={busy}
          error={errors.documents || undefined}
        />
        <p className="form-note">Attachments go to private storage, not to email.</p>
      </fieldset>

      <TextArea
        name="notes"
        label="Anything we should know"
        hint="A deadline, a known title issue, an estate, an entity buyer, a seller signing from abroad."
        error={errors.notes}
      />

      <Honeypot />

      <button type="submit" className="btn btn--primary" disabled={busy}>
        {status.kind === 'uploading'
          ? `Uploading ${status.done} of ${status.total}…`
          : status.kind === 'sending'
            ? 'Sending…'
            : 'Open the order'}
      </button>

      <p className="form-note" style={{ marginTop: '1rem' }}>
        This form opens a file and nothing more. Do not send bank account or wire details through
        it — not in a field, not in an attachment — or through email. We will never send you wire
        instructions by email, and we will not change instructions once given. Call{' '}
        {site.phoneDisplay} to verify anything that claims to come from us. What we do with what
        you send is set out in our <Link href="/privacy">privacy policy</Link>.
      </p>
    </form>
  );
}
