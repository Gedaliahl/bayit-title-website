'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';

import { TextField, TextArea, SelectField, Honeypot } from './Field';
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: 'sending' });
    setErrors({});

    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, source, page_path: pathname }),
      });

      const body = await response.json();

      if (response.status === 422 && body.errors) {
        setErrors(body.errors);
        setStatus({ kind: 'failed', message: 'Some details need another look.' });
        return;
      }

      if (!response.ok) {
        setStatus({ kind: 'failed', message: body.error ?? 'Something went wrong.' });
        return;
      }

      setStatus({ kind: 'sent' });
    } catch {
      setStatus({
        kind: 'failed',
        message: `We could not reach the server. Email ${site.email} or call ${site.phoneDisplay}.`,
      });
    }
  }

  if (status.kind === 'sent') {
    return (
      <div className="form-status form-status--ok" role="status">
        <p style={{ margin: 0 }}>{successMessage}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {status.kind === 'failed' ? (
        <p className="form-status form-status--error" role="alert">
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

      <button type="submit" className="btn btn--primary" disabled={status.kind === 'sending'}>
        {status.kind === 'sending' ? 'Sending…' : submitLabel}
      </button>

      <p className="form-note" style={{ marginTop: '1rem' }}>
        Please do not send bank account or wire details through this form. We will never email you
        wire instructions, and we will never change instructions once given. Call{' '}
        {site.phoneDisplay} to verify anything that claims to come from us.
      </p>
    </form>
  );
}
