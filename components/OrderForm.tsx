'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { track } from '@vercel/analytics';

import {
  BOT_CHECK_BLOCKED,
  BotCheck,
  ErrorSummary,
  FileField,
  Honeypot,
  outcomeUnknown,
  postJson,
  SelectField,
  TextArea,
  TextField,
  UploadMeter,
  useBotCheck,
  useFieldErrors,
  useLeaveWarning,
  useSubmissionId,
  withoutBlanks,
} from './Field';
import { useErrorFocus } from './useErrorFocus';
import {
  ACCEPT_ATTRIBUTE,
  ACCEPTED_LABEL,
  MAX_FILES,
  MAX_FILE_BYTES,
  MAX_TOTAL_BYTES,
  contentTypeFor,
  formatBytes,
  screenFiles,
  uploadWithProgress,
  type Rejection,
} from '@/lib/documents';
import { fieldErrors, orderSchema } from '@/lib/schemas';
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
  | { kind: 'uploading'; name: string; position: number; count: number; sent: number; total: number }
  | { kind: 'sent'; reference: string; attached: number; missing: Rejection[] }
  | { kind: 'failed'; message: string };

/** What the error summary calls each field, in the order the form shows them. */
const FIELD_LABELS: Record<string, string> = {
  ordered_by_name: 'Your name',
  ordered_by_role: 'Your role',
  ordered_by_email: 'Email',
  ordered_by_phone: 'Phone',
  property_address: 'Property address',
  county_slug: 'County',
  parcel_id: 'Parcel or folio number',
  transaction_type: 'Type',
  closing_method: 'Preferred signing',
  purchase_price: 'Purchase price',
  loan_amount: 'Loan amount',
  closing_date_target: 'Target closing date',
  lender_name: 'Lender',
  buyer_name: 'Buyer',
  seller_name: 'Seller',
  lender_contact: 'Lender contact',
  documents: 'Documents',
  notes: 'Anything we should know',
};

const SCREEN_RULES = {
  accepts: (name: string) => contentTypeFor(name) !== null,
  typeLabel: ACCEPTED_LABEL,
  maxFiles: MAX_FILES,
  maxFileBytes: MAX_FILE_BYTES,
  maxTotalBytes: MAX_TOTAL_BYTES,
};

export function OrderForm({ counties }: { counties: CountyOption[] }) {
  const pathname = usePathname();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const { errors, setErrors, clearOnInput } = useFieldErrors();
  const [files, setFiles] = useState<File[]>([]);
  const [rejected, setRejected] = useState<Rejection[]>([]);
  const { formRef, reportFailure } = useErrorFocus();
  const submission = useSubmissionId();
  const botCheck = useBotCheck();
  const summaryRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLParagraphElement>(null);
  const uploads = useRef<AbortController | null>(null);

  const busy = status.kind === 'sending' || status.kind === 'uploading';
  useLeaveWarning(status.kind === 'uploading');

  // The form is replaced by the confirmation, and focus would fall to the
  // page. Put it on the confirmation, which also has it read out.
  useEffect(() => {
    if (status.kind === 'sent') successRef.current?.focus();
  }, [status.kind]);

  /**
   * The same limits the Route Handler enforces, applied here so a file that
   * will be refused is refused now rather than after an upload — and named,
   * with the reason, rather than quietly left off the list.
   */
  function addFiles(added: File[]) {
    const screened = screenFiles(files, added, SCREEN_RULES);
    setFiles(screened.files);
    setRejected(screened.rejected);
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, i) => i !== index));
    setRejected([]);
  }

  function fail(message: string, outcome: string) {
    setStatus({ kind: 'failed', message });
    reportFailure();
    track('form_submit', { form: 'order', outcome });
  }

  /** With several fields wrong, the summary is where focus goes, not the first field. */
  function failOnFields(found: Record<string, string>) {
    setErrors(found);
    setStatus({ kind: 'idle' });
    track('form_submit', { form: 'order', outcome: 'invalid' });
    requestAnimationFrame(() => summaryRef.current?.focus());
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});

    const form = new FormData(event.currentTarget);
    // The file input is controlled in React state; everything else comes off
    // the form, and the manifest describes the files without sending them.
    form.delete('documents');
    const payload = {
      ...Object.fromEntries(form.entries()),
      page_path: pathname,
      documents: files.map((file) => ({ name: file.name, size: file.size })),
    };

    // The same schema the server runs, so a mistake is named without a round trip.
    const checked = orderSchema.safeParse(payload);
    if (!checked.success) return failOnFields(fieldErrors(checked.error));
    if (botCheck.enabled && !botCheck.token) {
      return fail(
        botCheck.unavailable
          ? BOT_CHECK_BLOCKED
          : 'Wait a moment for the check above the button to finish, then send again.',
        'bot_check',
      );
    }

    setStatus({ kind: 'sending' });
    const reply = await postJson<{
      reference?: string;
      order_id?: string;
      uploads?: UploadTicket[];
      error?: string;
      errors?: Record<string, string>;
    }>('/api/orders', {
      ...withoutBlanks(payload),
      submission_id: submission.current(),
      turnstile_token: botCheck.token || undefined,
    });
    botCheck.reset();

    if (outcomeUnknown(reply)) {
      return fail(
        `We did not hear back, so we cannot tell whether the order reached us. Call ` +
          `${site.phoneDisplay} before sending it again, or email ${site.ordersEmail}.`,
        'no_answer',
      );
    }
    if (reply.status === 422 && reply.body?.errors) return failOnFields(reply.body.errors);
    if (reply.status >= 400 || !reply.body) {
      return fail(reply.body?.error ?? 'Something went wrong.', 'refused');
    }

    // Past this line the order is recorded. Nothing that follows may present
    // itself as a failed order, because the office already has it.
    submission.settle();
    track('form_submit', { form: 'order', outcome: 'sent' });

    const reference = reply.body.reference ?? '';
    const orderId = reply.body.order_id;
    const tickets = reply.body.uploads ?? [];
    const ticketed = new Set(tickets.map((ticket) => ticket.index));
    const missing: Rejection[] = files
      .filter((_, index) => !ticketed.has(index))
      .map((file) => ({ name: file.name, reason: 'not accepted for upload' }));

    const uploaded: { path: string; name: string }[] = [];
    if (orderId && tickets.length > 0) {
      const controller = new AbortController();
      uploads.current = controller;

      // One at a time: the progress stays honest and a phone on a weak
      // connection is not asked to hold ten uploads open at once.
      for (const [position, ticket] of tickets.entries()) {
        const file = files[ticket.index];
        if (!file) continue;
        if (controller.signal.aborted) {
          missing.push({ name: file.name, reason: 'not sent, because the upload was stopped' });
          continue;
        }

        setStatus({ kind: 'uploading', name: file.name, position: position + 1, count: tickets.length, sent: 0, total: file.size });
        const ok = await uploadWithProgress(
          ticket,
          file,
          (sent, total) => setStatus((current) => (current.kind === 'uploading' ? { ...current, sent, total } : current)),
          controller.signal,
        );
        if (ok) uploaded.push({ path: ticket.path, name: file.name });
        else missing.push({ name: file.name, reason: controller.signal.aborted ? 'stopped before it finished' : 'the upload failed' });
      }
      uploads.current = null;
    }

    let attached = 0;
    if (uploaded.length > 0) {
      const confirmed = await postJson<{ recorded?: number; rejected?: Rejection[] }>('/api/orders/documents', {
        order_id: orderId,
        documents: uploaded,
      });
      if (confirmed.status >= 200 && confirmed.status < 300 && confirmed.body) {
        attached = confirmed.body.recorded ?? 0;
        const refused = confirmed.body.rejected ?? [];
        missing.push(...refused);
        const unaccounted = uploaded.length - attached - refused.length;
        if (unaccounted > 0) {
          missing.push({ name: `${unaccounted} other file${unaccounted === 1 ? '' : 's'}`, reason: 'did not arrive in storage' });
        }
      } else {
        missing.push(...uploaded.map((doc) => ({ name: doc.name, reason: 'uploaded, but could not be attached' })));
      }
    }

    if (missing.length > 0) track('upload_failed', { form: 'order', count: missing.length });
    setStatus({ kind: 'sent', reference, attached, missing });
  }

  if (status.kind === 'sent') {
    return (
      <div className="form-status form-status--ok" role="status">
        <p style={{ marginBottom: '0.5rem' }} ref={successRef} tabIndex={-1}>
          <strong>Order received{status.reference ? ` — ${status.reference}` : ''}.</strong>
        </p>
        {status.attached > 0 ? (
          <p style={{ marginBottom: '0.5rem' }}>
            {status.attached} document{status.attached === 1 ? '' : 's'} attached to the file.
          </p>
        ) : null}
        {/* Never let a silent upload failure pass as success: the office would
            be waiting on a document nobody sent. */}
        {status.missing.length > 0 ? (
          <>
            <p style={{ marginBottom: '0.25rem' }}>
              {status.missing.length === 1 ? 'This did' : 'These did'} not reach us:
            </p>
            <ul className="form-status__list">
              {status.missing.map((doc, index) => (
                <li key={`${doc.name}-${index}`}>
                  {doc.name} — {doc.reason}
                </li>
              ))}
            </ul>
            <p style={{ marginBottom: '0.5rem' }}>
              The order is recorded either way. Email {status.missing.length === 1 ? 'it' : 'them'} to{' '}
              <a href={`mailto:${site.ordersEmail}`}>{site.ordersEmail}</a>
              {status.reference ? ` with the reference ${status.reference}` : ''}.
            </p>
          </>
        ) : null}
        <p style={{ margin: 0 }}>
          We will confirm by email and tell you what the search turns up.
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} onInput={clearOnInput} noValidate>
      <ErrorSummary errors={errors} labels={FIELD_LABELS} summaryRef={summaryRef} />

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
          rejected={rejected}
          onAdd={addFiles}
          onRemove={removeFile}
          disabled={busy}
          error={errors.documents}
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

      <button type="submit" className="btn btn--primary" disabled={busy}>
        {status.kind === 'uploading'
          ? `Uploading ${status.position} of ${status.count}…`
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
