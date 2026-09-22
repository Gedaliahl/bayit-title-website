// Shared validation for the public form endpoints. The same schema runs in the
// browser for immediate feedback and in the Route Handler as the real gate —
// client-side validation is a convenience, never the boundary.

// Named imports, not the `z` namespace. The namespace drags every one of
// zod's locale bundles into the browser — measured at 93 KB gzipped for these
// schemas, against 28 KB this way — and these run in the browser too.
import {
  NEVER,
  array,
  email,
  enum as oneOf,
  iso,
  number,
  object,
  preprocess,
  string,
  union,
  uuid,
  type ZodError,
  type ZodType,
  type output,
} from 'zod';

import { FLORIDA_COUNTIES } from './florida-counties';
import { MAX_FILES } from './documents';

const trimmed = (max: number) => string().trim().max(max);

/**
 * Blank means "not provided", and "not provided" is stored as null.
 *
 * An untouched select or an empty box posts `''`, and `''` is a value: it went
 * into `county_slug` as a county called nothing, the foreign key on
 * `locations(slug)` refused it, and every order sent with County left on
 * "Select…" failed with a 500. Normalising here means no optional field can
 * reach the database as an empty string.
 */
function blankToNull<T extends ZodType>(schema: T) {
  return preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    schema.optional(),
  ).transform((value) => value ?? null);
}

const optionalText = (max: number) => blankToNull(trimmed(max));

/**
 * One of the sixty-seven counties, by the slug the locations table uses.
 *
 * Checked here rather than left to the foreign key, so a stale or hand-edited
 * value is a message next to the field instead of a failed insert.
 */
const COUNTY_SLUGS = FLORIDA_COUNTIES.map((county) => county.slug) as [string, ...string[]];
const optionalCounty = blankToNull(oneOf(COUNTY_SLUGS, 'Pick a county from the list.'));

/**
 * A dollar amount as a person types it: digits, commas in the thousands
 * places if they like, and cents if they must.
 *
 * `Number()` was the old parser, and it reads far more than money — '1e5' as a
 * hundred thousand, '0x10' as sixteen — so the shape is checked first and
 * nothing that is not written like an amount gets as far as a number.
 */
const MONEY = /^(\d{1,3}(,\d{3})+|\d+)(\.\d{1,2})?$/;

/**
 * Currency arriving as a string from a form field. Empty means "not provided".
 *
 * Anything else that will not parse is an error, not a silent undefined. The
 * transform used to swallow it, which made the message below unreachable and
 * meant "about four hundred k" submitted cleanly as no price at all — the
 * sender believing they had told us, the office seeing a blank field.
 */
const optionalMoney = union([string(), number()])
  .optional()
  .transform((value, context) => {
    if (value === undefined) return undefined;
    if (typeof value === 'number') {
      if (Number.isFinite(value) && value >= 0 && value < 1_000_000_000) return value;
    } else {
      const typed = value.replace(/^\s*\$?\s*/, '').trim();
      if (typed === '') return undefined;
      if (MONEY.test(typed)) {
        const amount = Number(typed.replace(/,/g, ''));
        if (amount < 1_000_000_000) return amount;
      }
    }
    context.addIssue({ code: 'custom', message: 'Enter an amount as a number, like 450,000.' });
    return NEVER;
  });

/**
 * A phone number the office can dial, stored as digits.
 *
 * US numbers in any of the usual shapes — (954) 555-0123, 954.555.0123,
 * +1 954 555 0123 — come out as ten digits. A number written with a leading +
 * and a country code is kept as it is, digits only, because a seller signing
 * from abroad is ordinary here. Letters, or too few digits to be a number, are
 * refused rather than stored for someone to puzzle over later.
 */
const optionalPhone = blankToNull(
  string()
    .trim()
    .max(40)
    .transform((value, context) => {
      if (/^[+\d\s().-]+$/.test(value)) {
        const digits = value.replace(/\D/g, '');
        const international = value.startsWith('+');
        if (!international && digits.length === 10) return digits;
        if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
        if (international && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
      }
      context.addIssue({
        code: 'custom',
        message: 'Enter a phone number we can call, like 954-555-0123.',
      });
      return NEVER;
    }),
);

/**
 * Bots fill hidden fields. Anything is accepted here so validation still passes;
 * the Route Handler checks the value and files the submission as spam, answering
 * as though it succeeded. Rejecting it here instead would name the trap in the
 * error response and tell the bot exactly what to omit next time.
 *
 * The name means nothing to autofill. It used to be `company`, which browsers
 * and password managers fill in on their own — and every real order they
 * touched was answered "received" and thrown away.
 */
export const HONEYPOT_FIELD = 'ref_note';
const honeypot = string().optional();

/**
 * Generated in the browser once per submission and sent again with any retry,
 * so a request that reached us but whose answer never came back is not
 * recorded twice when the sender tries again.
 */
const submissionId = uuid().optional();

/** The Turnstile token, when the check is switched on. Verified server-side. */
const botToken = string().max(2048).optional();

export const leadSchema = object({
  // 'calculator' is left off on purpose: it marks a contract sent from
  // /estimate, which only that route writes, so the two rate limits cannot be
  // borrowed from each other.
  source: oneOf(['quote', 'contact', 'partner', 'other']).default('quote'),
  full_name: trimmed(120).min(2, 'Tell us your name.'),
  email: email('Enter an email we can reply to.').max(160),
  phone: optionalPhone,
  role: optionalText(60),
  property_address: optionalText(240),
  county_slug: optionalCounty,
  transaction_type: optionalText(60),
  purchase_price: optionalMoney,
  loan_amount: optionalMoney,
  message: optionalText(4000),
  heard_about_us: optionalText(120),
  page_path: optionalText(240),
  submission_id: submissionId,
  turnstile_token: botToken,
  [HONEYPOT_FIELD]: honeypot,
});

/**
 * What the browser says it is about to upload. The server mints one upload URL
 * per entry, so this is a request for permission, not a record of a file — the
 * bucket listing decides what actually arrived.
 */
export const declaredDocumentSchema = object({
  name: string().trim().min(1).max(255),
  size: number().int().nonnegative(),
});

const TOO_MANY_FILES = `No more than ${MAX_FILES} files.`;

export const orderSchema = object({
  ordered_by_name: trimmed(120).min(2, 'Tell us who is opening the order.'),
  ordered_by_email: email('Enter an email we can send the commitment to.').max(160),
  ordered_by_phone: optionalPhone,
  ordered_by_role: optionalText(60),
  buyer_name: optionalText(200),
  seller_name: optionalText(200),
  property_address: trimmed(240).min(5, 'We need the property address to order a search.'),
  county_slug: optionalCounty,
  parcel_id: optionalText(80),
  transaction_type: optionalText(60),
  purchase_price: optionalMoney,
  loan_amount: optionalMoney,
  lender_name: optionalText(160),
  lender_contact: optionalText(200),
  // A real calendar date, not just the shape of one: '2026-02-31' used to pass
  // here and then fail the insert into a date column with a 500.
  closing_date_target: blankToNull(iso.date('Use a real date in YYYY-MM-DD form.')),
  closing_method: optionalText(60),
  notes: optionalText(4000),
  page_path: optionalText(240),
  documents: array(declaredDocumentSchema).max(MAX_FILES, TOO_MANY_FILES).optional(),
  submission_id: submissionId,
  turnstile_token: botToken,
  [HONEYPOT_FIELD]: honeypot,
});

/** A finished upload, named by the path the server issued for it. */
const uploadedDocumentSchema = object({
  /** A path the server issued. Re-checked against the owner and the bucket. */
  path: string().trim().min(1).max(300),
  /** The label only. Size and type are read from the stored object. */
  name: string().trim().min(1).max(255),
});

/**
 * A confirmation that uploads finished. Paths are the server's own — it issued
 * them — and every one is re-checked against the order before it is recorded.
 */
export const confirmDocumentsSchema = object({
  order_id: uuid('Unknown order.'),
  documents: array(uploadedDocumentSchema).min(1).max(MAX_FILES),
});

/** Who a contract sent from /estimate is from, in their own description. */
export const CONTRACT_QUOTE_ROLES = ['buyer', 'seller', 'borrower', 'agent', 'lender', 'attorney'] as const;

/**
 * A contract sent for pricing from /estimate. The files themselves travel
 * straight to storage, as an order's do; this is the manifest and the person
 * to write back to. The name and the email are the two things the office
 * cannot do without, and the messages here are the ones the page shows.
 */
export const contractQuoteSchema = object({
  full_name: trimmed(120).min(2, 'Tell us your name so we know who to write back to.'),
  email: email('That email does not look complete.').max(160),
  phone: optionalPhone,
  role: oneOf(CONTRACT_QUOTE_ROLES).default('buyer'),
  message: optionalText(4000),
  page_path: optionalText(240),
  documents: array(declaredDocumentSchema)
    .min(1, 'Add the contract first — a PDF or a photo of each page.')
    .max(MAX_FILES, TOO_MANY_FILES),
  submission_id: submissionId,
  turnstile_token: botToken,
  [HONEYPOT_FIELD]: honeypot,
});

/** The pages that finished uploading, to be linked in the office's email. */
export const confirmQuoteDocumentsSchema = object({
  lead_id: uuid('Unknown request.'),
  documents: array(uploadedDocumentSchema).min(1).max(MAX_FILES),
});

export type LeadInput = output<typeof leadSchema>;
export type ContractQuoteInput = output<typeof contractQuoteSchema>;
export type OrderInput = output<typeof orderSchema>;
export type ConfirmDocumentsInput = output<typeof confirmDocumentsSchema>;

/**
 * Flattens Zod issues into `{ field: message }` for rendering next to inputs.
 *
 * Keyed by the top-level field. An issue deep inside a list — the size of the
 * third document — has nowhere of its own to be shown, so it is shown against
 * the field that holds the list rather than not at all.
 */
export function fieldErrors(error: ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : 'form';
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}
