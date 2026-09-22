/**
 * The form schemas. The browser runs these for immediate feedback and the Route
 * Handler runs them as the actual gate, so a hole here is a hole in the gate.
 */
import { describe, expect, it } from 'vitest';

import {
  orderSchema,
  leadSchema,
  confirmDocumentsSchema,
  contractQuoteSchema,
  confirmQuoteDocumentsSchema,
  fieldErrors,
} from '@/lib/schemas';

const validOrder = {
  ordered_by_name: 'Jane Agent',
  ordered_by_email: 'jane@example.com',
  property_address: '123 Main St, Coral Springs FL 33065',
};

describe('what an order must have', () => {
  it('accepts the minimum: who is asking and which property', () => {
    expect(orderSchema.safeParse(validOrder).success).toBe(true);
  });

  it('refuses an order with no property address', () => {
    const result = orderSchema.safeParse({ ...validOrder, property_address: '' });
    expect(result.success).toBe(false);
    expect(fieldErrors(result.error!).property_address).toMatch(/need the property address/);
  });

  it('refuses an address we cannot send a commitment to', () => {
    const result = orderSchema.safeParse({ ...validOrder, ordered_by_email: 'jane@' });
    expect(fieldErrors(result.error!).ordered_by_email).toMatch(/email/i);
  });
});

describe('money arriving as typed', () => {
  it('reads a formatted price as a number', () => {
    const parsed = orderSchema.parse({ ...validOrder, purchase_price: '$450,000' });
    expect(parsed.purchase_price).toBe(450000);
  });

  it('treats an empty field as not provided, not as zero', () => {
    const parsed = orderSchema.parse({ ...validOrder, purchase_price: '', loan_amount: '' });
    expect(parsed.purchase_price).toBeUndefined();
    expect(parsed.loan_amount).toBeUndefined();
  });

  it('rejects something that is not a number at all', () => {
    const result = orderSchema.safeParse({ ...validOrder, purchase_price: 'about four hundred k' });
    expect(result.success).toBe(false);
  });
});

describe('the target closing date', () => {
  it('accepts a plain ISO date', () => {
    expect(orderSchema.parse({ ...validOrder, closing_date_target: '2026-11-01' })
      .closing_date_target).toBe('2026-11-01');
  });

  it('treats an untouched date field as not provided', () => {
    expect(orderSchema.parse({ ...validOrder, closing_date_target: '' })
      .closing_date_target).toBeUndefined();
  });

  it('refuses a date in any other shape', () => {
    expect(orderSchema.safeParse({ ...validOrder, closing_date_target: '11/01/2026' }).success)
      .toBe(false);
  });
});

describe('the honeypot', () => {
  it('validates cleanly when filled, so the response teaches a bot nothing', () => {
    // Rejecting here would name the trap in the error response. The Route
    // Handler checks the value and discards the submission instead.
    const parsed = orderSchema.parse({ ...validOrder, company: 'Acme Bots' });
    expect(parsed.company).toBe('Acme Bots');
  });
});

describe('the document manifest', () => {
  it('accepts a list of names and sizes', () => {
    const parsed = orderSchema.parse({
      ...validOrder,
      documents: [{ name: 'contract.pdf', size: 120_000 }],
    });
    expect(parsed.documents).toEqual([{ name: 'contract.pdf', size: 120_000 }]);
  });

  it('refuses a negative size', () => {
    const result = orderSchema.safeParse({
      ...validOrder,
      documents: [{ name: 'contract.pdf', size: -1 }],
    });
    expect(result.success).toBe(false);
  });
});

describe('confirming an upload', () => {
  it('refuses anything that is not a real order id', () => {
    const result = confirmDocumentsSchema.safeParse({
      order_id: 'not-a-uuid',
      documents: [{ path: 'orders/x/y.pdf', name: 'y.pdf' }],
    });
    expect(result.success).toBe(false);
  });

  it('refuses a confirmation with nothing in it', () => {
    expect(
      confirmDocumentsSchema.safeParse({
        order_id: '11111111-1111-4111-8111-111111111111',
        documents: [],
      }).success,
    ).toBe(false);
  });
});

describe('leads', () => {
  it('defaults an unlabelled submission to the quote form', () => {
    const parsed = leadSchema.parse({ full_name: 'Jane Agent', email: 'jane@example.com' });
    expect(parsed.source).toBe('quote');
  });

  it('reports one message per field, in field order', () => {
    const result = leadSchema.safeParse({ full_name: 'J', email: 'nope' });
    const errors = fieldErrors(result.error!);
    expect(Object.keys(errors)).toEqual(['full_name', 'email']);
  });
});

/**
 * A contract sent for pricing from /estimate. The page promises the sender
 * three things before it sends anything — a file, a name, an address to write
 * back to — and these are the messages it shows when one is missing.
 */
describe('a contract sent for pricing', () => {
  const validQuote = {
    full_name: 'Dana Buyer',
    email: 'dana@example.com',
    documents: [{ name: 'contract.pdf', size: 1_200_000 }],
  };

  it('accepts a file, a name and an email, and defaults the role to buyer', () => {
    const parsed = contractQuoteSchema.parse(validQuote);
    expect(parsed.role).toBe('buyer');
    expect(parsed.documents).toHaveLength(1);
  });

  it('refuses a request with nothing attached, in the page’s own words', () => {
    const result = contractQuoteSchema.safeParse({ ...validQuote, documents: [] });
    expect(result.success).toBe(false);
    expect(fieldErrors(result.error!).documents).toMatch(/Add the contract first/);
  });

  it('refuses a request with nobody to write back to', () => {
    const noName = contractQuoteSchema.safeParse({ ...validQuote, full_name: '' });
    expect(fieldErrors(noName.error!).full_name).toMatch(/your name/);

    const badEmail = contractQuoteSchema.safeParse({ ...validQuote, email: 'dana@' });
    expect(fieldErrors(badEmail.error!).email).toMatch(/does not look complete/);
  });

  it('only knows the roles the page offers', () => {
    expect(contractQuoteSchema.safeParse({ ...validQuote, role: 'lender' }).success).toBe(true);
    expect(contractQuoteSchema.safeParse({ ...validQuote, role: 'underwriter' }).success).toBe(false);
  });

  it('confirms pages only against a real lead id', () => {
    expect(
      confirmQuoteDocumentsSchema.safeParse({
        lead_id: '2c0b8f6e-4d1a-4a2b-9c3d-0e1f2a3b4c5d',
        documents: [{ path: 'quotes/x/y.pdf', name: 'contract.pdf' }],
      }).success,
    ).toBe(true);
    expect(
      confirmQuoteDocumentsSchema.safeParse({ lead_id: 'not-a-uuid', documents: [] }).success,
    ).toBe(false);
  });
});
