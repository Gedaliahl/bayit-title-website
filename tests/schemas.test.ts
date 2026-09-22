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
  HONEYPOT_FIELD,
} from '@/lib/schemas';
import { MAX_FILES } from '@/lib/documents';

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

  it('keeps the cents, and reads commas only as thousands', () => {
    expect(orderSchema.parse({ ...validOrder, purchase_price: '450,000.00' }).purchase_price).toBe(450000);
    expect(orderSchema.parse({ ...validOrder, loan_amount: '360000.5' }).loan_amount).toBe(360000.5);
    expect(orderSchema.safeParse({ ...validOrder, purchase_price: '4,50000' }).success).toBe(false);
    expect(orderSchema.safeParse({ ...validOrder, purchase_price: '450000.123' }).success).toBe(false);
  });

  it('refuses what Number() would have read as money', () => {
    // '1e5' was a hundred thousand and '0x10' was sixteen.
    for (const typed of ['1e5', '0x10', 'Infinity', '-5', '12 000']) {
      expect(orderSchema.safeParse({ ...validOrder, purchase_price: typed }).success).toBe(false);
    }
  });
});

describe('optional fields left empty', () => {
  it('become null, never an empty string', () => {
    // '' in county_slug failed the foreign key and turned every such order into a 500.
    const parsed = orderSchema.parse({
      ...validOrder,
      county_slug: '',
      parcel_id: '',
      lender_name: '  ',
      ordered_by_phone: '',
    });
    expect(parsed.county_slug).toBeNull();
    expect(parsed.parcel_id).toBeNull();
    expect(parsed.lender_name).toBeNull();
    expect(parsed.ordered_by_phone).toBeNull();
  });

  it('do the same on a lead and a contract', () => {
    expect(leadSchema.parse({ full_name: 'Jane Agent', email: 'jane@example.com', message: '' }).message)
      .toBeNull();
    expect(
      contractQuoteSchema.parse({
        full_name: 'Dana Buyer',
        email: 'dana@example.com',
        phone: '',
        documents: [{ name: 'contract.pdf', size: 1 }],
      }).phone,
    ).toBeNull();
  });
});

describe('the county', () => {
  it('must be one of the sixty-seven', () => {
    expect(orderSchema.parse({ ...validOrder, county_slug: 'miami-dade-county' }).county_slug)
      .toBe('miami-dade-county');
    const result = orderSchema.safeParse({ ...validOrder, county_slug: 'dade' });
    expect(fieldErrors(result.error!).county_slug).toMatch(/county/i);
  });
});

describe('phone numbers', () => {
  it('reads the usual US shapes as ten digits', () => {
    for (const typed of ['(954) 555-0123', '954.555.0123', '954-555-0123', '+1 954 555 0123', '1-954-555-0123']) {
      expect(orderSchema.parse({ ...validOrder, ordered_by_phone: typed }).ordered_by_phone).toBe('9545550123');
    }
  });

  it('keeps a number written with its country code', () => {
    expect(orderSchema.parse({ ...validOrder, ordered_by_phone: '+44 20 7946 0958' }).ordered_by_phone)
      .toBe('+442079460958');
  });

  it('refuses something that is not a phone number', () => {
    for (const typed of ['call me', '555-0123', '954-555-01234', 'ext 5']) {
      expect(orderSchema.safeParse({ ...validOrder, ordered_by_phone: typed }).success).toBe(false);
    }
  });
});

describe('the target closing date', () => {
  it('accepts a plain ISO date', () => {
    expect(orderSchema.parse({ ...validOrder, closing_date_target: '2026-11-01' })
      .closing_date_target).toBe('2026-11-01');
  });

  it('treats an untouched date field as not provided', () => {
    expect(orderSchema.parse({ ...validOrder, closing_date_target: '' })
      .closing_date_target).toBeNull();
  });

  it('refuses a date in any other shape', () => {
    expect(orderSchema.safeParse({ ...validOrder, closing_date_target: '11/01/2026' }).success)
      .toBe(false);
  });

  it('refuses a date that is not on the calendar', () => {
    // This one used to pass the shape check and fail the insert with a 500.
    expect(orderSchema.safeParse({ ...validOrder, closing_date_target: '2026-02-31' }).success)
      .toBe(false);
    expect(orderSchema.safeParse({ ...validOrder, closing_date_target: '2028-02-29' }).success)
      .toBe(true);
  });
});

describe('the honeypot', () => {
  it('validates cleanly when filled, so the response teaches a bot nothing', () => {
    // Rejecting here would name the trap in the error response. The Route
    // Handler checks the value and files the submission as spam instead.
    const parsed = orderSchema.parse({ ...validOrder, [HONEYPOT_FIELD]: 'Acme Bots' });
    expect(parsed[HONEYPOT_FIELD]).toBe('Acme Bots');
  });

  it('has a name autofill has no reason to fill', () => {
    expect(HONEYPOT_FIELD).not.toMatch(/company|organi[sz]ation|name|email|phone|address|tel|url/i);
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

  it('refuses a negative size, and says so against the documents field', () => {
    const result = orderSchema.safeParse({
      ...validOrder,
      documents: [{ name: 'contract.pdf', size: -1 }],
    });
    expect(result.success).toBe(false);
    // The issue is at documents.0.size, which no input is named; it is shown
    // against the field that holds the list rather than not at all.
    expect(Object.keys(fieldErrors(result.error!))).toEqual(['documents']);
  });

  it('allows no more files than the upload limit', () => {
    const documents = (count: number) =>
      Array.from({ length: count }, (_, i) => ({ name: `${i}.pdf`, size: 1 }));
    expect(orderSchema.safeParse({ ...validOrder, documents: documents(MAX_FILES) }).success).toBe(true);
    expect(orderSchema.safeParse({ ...validOrder, documents: documents(MAX_FILES + 1) }).success).toBe(false);
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
  it('does not accept the source that marks a contract sent from /estimate', () => {
    const result = leadSchema.safeParse({ full_name: 'Jane Agent', email: 'jane@example.com', source: 'calculator' });
    expect(result.success).toBe(false);
  });

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
