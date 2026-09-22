'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { track } from '@vercel/analytics';

import { useErrorFocus } from './useErrorFocus';
import {
  BOT_CHECK_BLOCKED,
  BotCheck,
  Honeypot,
  outcomeUnknown,
  postJson,
  SelectField,
  TextArea,
  TextField,
  useBotCheck,
  useFieldErrors,
  useSubmissionId,
} from './Field';
import { fieldErrors, leadSchema } from '@/lib/schemas';
import { site } from '@/lib/site';

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent' }
  | { kind: 'failed'; message: string };

export function LeadForm({
  source,
  counties,
  submitLabel,
  successMessage,
  showTransactionFields = false,
}: {
  source: 'quote' | 'contact' | 'partner';
  counties: { value: string; label: string }[];
  submitLabel: string;
  successMessage: string;
  showTransactionFields?: boolean;
}) {
  const pathname = usePathname();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const { errors, setErrors, clearOnInput } = useFieldErrors();
  const { formRef, reportFailure } = useErrorFocus();
  const submission = useSubmissionId();
  const botCheck = useBotCheck();
  const successRef = useRef<HTMLParagraphElement>(null);

  // The form is gone once it is sent, and focus with it. Put it on the
  // confirmation, which also has it read out.
  useEffect(() => {
    if (status.kind === 'sent') successRef.current?.focus();
  }, [status.kind]);

  function fail(message: string, outcome: string) {
    setStatus({ kind: 'failed', message });
    reportFailure();
    track('form_submit', { form: source, outcome });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});

    const payload = {
      ...Object.fromEntries(new FormData(event.currentTarget).entries()),
      source,
      page_path: pathname,
    };

    // The same schema the server runs, so a mistake is named without a round trip.
    const checked = leadSchema.safeParse(payload);
    if (!checked.success) {
      setErrors(fieldErrors(checked.error));
      return fail('Some details need another look.', 'invalid');
    }
    if (botCheck.enabled && !botCheck.token) {
      return fail(
        botCheck.unavailable
          ? BOT_CHECK_BLOCKED
          : 'Wait a moment for the check above the button to finish, then send again.',
        'bot_check',
      );
    }

    setStatus({ kind: 'sending' });
    const reply = await postJson<{ error?: string; errors?: Record<string, string> }>('/api/leads', {
      ...payload,
      submission_id: submission.current(),
      turnstile_token: botCheck.token || undefined,
    });
    botCheck.reset();

    if (outcomeUnknown(reply)) {
      return fail(
        `We did not hear back, so we cannot tell whether this reached us. Call ${site.phoneDisplay} ` +
          `or email ${site.email} before sending it again.`,
        'no_answer',
      );
    }
    if (reply.status === 422 && reply.body?.errors) {
      setErrors(reply.body.errors);
      return fail('Some details need another look.', 'invalid');
    }
    if (reply.status >= 400) {
      return fail(reply.body?.error ?? 'Something went wrong.', 'refused');
    }

    submission.settle();
    setStatus({ kind: 'sent' });
    track('form_submit', { form: source, outcome: 'sent' });
  }

  if (status.kind === 'sent') {
    return (
      <div className="form-status form-status--ok" role="status">
        <p style={{ margin: 0 }} ref={successRef} tabIndex={-1}>
          {successMessage}
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} onInput={clearOnInput} noValidate>
      {status.kind === 'failed' ? (
        // tabIndex so focus can land here when no single field is at fault.
        <p className="form-status form-status--error" role="alert" tabIndex={-1}>
          {status.message}
        </p>
      ) : null}

      <div className="field-row">
        <TextField
          name="full_name"
          label="Your name"
          required
          autoComplete="name"
          error={errors.full_name}
        />
        <TextField
          name="role"
          label="Your role"
          hint="Agent, lender, buyer, seller, attorney"
          error={errors.role}
        />
      </div>

      <div className="field-row">
        <TextField
          name="email"
          label="Email"
          type="email"
          inputMode="email"
          required
          autoComplete="email"
          error={errors.email}
        />
        <TextField
          name="phone"
          label="Phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          error={errors.phone}
        />
      </div>

      {showTransactionFields ? (
        <>
          <TextField
            name="property_address"
            label="Property address"
            hint="A quote needs the county and the price; the address gets us both."
            error={errors.property_address}
          />
          <div className="field-row">
            <SelectField
              name="county_slug"
              label="County"
              options={counties}
              error={errors.county_slug}
            />
            <SelectField
              name="transaction_type"
              label="Transaction"
              options={[
                { value: 'purchase', label: 'Purchase' },
                { value: 'refinance', label: 'Refinance' },
                { value: 'cash-purchase', label: 'Cash purchase' },
                { value: 'commercial', label: 'Commercial' },
                { value: 'other', label: 'Something else' },
              ]}
              error={errors.transaction_type}
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
        </>
      ) : null}

      <TextArea name="message" label="What do you need?" error={errors.message} />

      <TextField name="heard_about_us" label="How did you hear about us?" error={errors.heard_about_us} />

      <Honeypot />

      <BotCheck enabled={botCheck.enabled} attach={botCheck.attach} />

      <button type="submit" className="btn btn--primary" disabled={status.kind === 'sending'}>
        {status.kind === 'sending' ? 'Sending…' : submitLabel}
      </button>

      <p className="form-note" style={{ marginTop: '1rem' }}>
        Please do not send bank account or wire details through this form. We will never email you
        wire instructions, and we will never change instructions once given. Call{' '}
        {site.phoneDisplay} to verify anything that claims to come from us. What we do with what
        you send is set out in our <Link href="/privacy">privacy policy</Link>.
      </p>
    </form>
  );
}
