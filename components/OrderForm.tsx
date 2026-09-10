'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';

import { TextField, TextArea, SelectField, Honeypot } from './Field';
import { site } from '@/lib/site';

interface CountyOption {
  value: string;
  label: string;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; reference: string }
  | { kind: 'failed'; message: string };

export function OrderForm({ counties }: { counties: CountyOption[] }) {
  const pathname = usePathname();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: 'sending' });
    setErrors({});

    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, page_path: pathname }),
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

      setStatus({ kind: 'sent', reference: body.reference ?? '' });
    } catch {
      setStatus({
        kind: 'failed',
        message: `We could not reach the server. Email ${site.ordersEmail} or call ${site.phoneDisplay}.`,
      });
    }
  }

  if (status.kind === 'sent') {
    return (
      <div className="form-status form-status--ok" role="status">
        <p style={{ marginBottom: '0.5rem' }}>
          <strong>Order received{status.reference ? ` — ${status.reference}` : ''}.</strong>
        </p>
        <p style={{ margin: 0 }}>
          We will confirm by email and tell you what the search turns up. If you need to send
          documents, reply to that confirmation rather than uploading them here.
        </p>
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

      <TextArea
        name="notes"
        label="Anything we should know"
        hint="A deadline, a known title issue, an estate, an entity buyer, a seller signing from abroad."
        error={errors.notes}
      />

      <Honeypot />

      <button type="submit" className="btn btn--primary" disabled={status.kind === 'sending'}>
        {status.kind === 'sending' ? 'Sending…' : 'Open the order'}
      </button>

      <p className="form-note" style={{ marginTop: '1rem' }}>
        This form opens a file and nothing more. Do not send bank account or wire details through
        it, or through email — we will never send you wire instructions by email, and we will not
        change instructions once given. Call {site.phoneDisplay} to verify anything that claims to
        come from us.
      </p>
    </form>
  );
}
