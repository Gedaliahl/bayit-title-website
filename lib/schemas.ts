// Shared validation for the public form endpoints. The same schema runs in the
// browser for immediate feedback and in the Route Handler as the real gate —
// client-side validation is a convenience, never the boundary.

import { z } from 'zod';

const trimmed = (max: number) => z.string().trim().max(max);

/**
 * Currency arriving as a string from a form field. Empty means "not provided".
 *
 * Anything else that will not parse is an error, not a silent undefined. The
 * transform used to swallow it, which made the message below unreachable and
 * meant "about four hundred k" submitted cleanly as no price at all — the
 * sender believing they had told us, the office seeing a blank field.
 */
const optionalMoney = z
  .union([z.string(), z.number()])
  .optional()
  .transform((value) => {
    if (value === undefined || value === '') return undefined;
    return Number(String(value).replace(/[$,\s]/g, ''));
  })
  .refine(
    (value) => value === undefined || (Number.isFinite(value) && value >= 0 && value < 1_000_000_000),
    { message: 'Enter an amount as a number.' },
  );

/**
 * Bots fill hidden fields. Anything is accepted here so validation still passes;
 * the Route Handler checks the value and discards the submission, answering as
 * though it succeeded. Rejecting it here instead would name the trap in the
 * error response and tell the bot exactly what to omit next time.
 */
const honeypot = z.string().optional();

export const leadSchema = z.object({
  source: z.enum(['quote', 'contact', 'partner', 'calculator', 'other']).default('quote'),
  full_name: trimmed(120).min(2, 'Tell us your name.'),
  email: z.email('Enter an email we can reply to.').max(160),
  phone: trimmed(40).optional(),
  role: trimmed(60).optional(),
  property_address: trimmed(240).optional(),
  county_slug: trimmed(80).optional(),
  transaction_type: trimmed(60).optional(),
  purchase_price: optionalMoney,
  loan_amount: optionalMoney,
  message: trimmed(4000).optional(),
  heard_about_us: trimmed(120).optional(),
  page_path: trimmed(240).optional(),
  company: honeypot,
});

/**
 * What the browser says it is about to upload. The server mints one upload URL
 * per entry, so this is a request for permission, not a record of a file — the
 * bucket listing decides what actually arrived.
 */
export const declaredDocumentSchema = z.object({
  name: z.string().trim().min(1).max(255),
  size: z.number().int().nonnegative(),
});

export const orderSchema = z.object({
  ordered_by_name: trimmed(120).min(2, 'Tell us who is opening the order.'),
  ordered_by_email: z.email('Enter an email we can send the commitment to.').max(160),
  ordered_by_phone: trimmed(40).optional(),
  ordered_by_role: trimmed(60).optional(),
  buyer_name: trimmed(200).optional(),
  seller_name: trimmed(200).optional(),
  property_address: trimmed(240).min(5, 'We need the property address to order a search.'),
  county_slug: trimmed(80).optional(),
  parcel_id: trimmed(80).optional(),
  transaction_type: trimmed(60).optional(),
  purchase_price: optionalMoney,
  loan_amount: optionalMoney,
  lender_name: trimmed(160).optional(),
  lender_contact: trimmed(200).optional(),
  closing_date_target: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date in YYYY-MM-DD form.')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  closing_method: trimmed(60).optional(),
  notes: trimmed(4000).optional(),
  page_path: trimmed(240).optional(),
  documents: z.array(declaredDocumentSchema).max(20).optional(),
  company: honeypot,
});

/**
 * A confirmation that uploads finished. Paths are the server's own — it issued
 * them — and every one is re-checked against the order before it is recorded.
 */
export const confirmDocumentsSchema = z.object({
  order_id: z.uuid('Unknown order.'),
  documents: z
    .array(
      z.object({
        /** A path the server issued. Re-checked against the order and the bucket. */
        path: z.string().trim().min(1).max(300),
        /** The label only. Size and type are read from the stored object. */
        name: z.string().trim().min(1).max(255),
      }),
    )
    .min(1)
    .max(20),
});

/** Who a contract sent from /estimate is from, in their own description. */
export const CONTRACT_QUOTE_ROLES = ['buyer', 'seller', 'borrower', 'agent', 'lender', 'attorney'] as const;

/**
 * A contract sent for pricing from /estimate. The files themselves travel
 * straight to storage, as an order's do; this is the manifest and the person
 * to write back to. The name and the email are the two things the office
 * cannot do without, and the messages here are the ones the page shows.
 */
export const contractQuoteSchema = z.object({
  full_name: trimmed(120).min(2, 'Tell us your name so we know who to write back to.'),
  email: z.email('That email does not look complete.').max(160),
  phone: trimmed(40).optional(),
  role: z.enum(CONTRACT_QUOTE_ROLES).default('buyer'),
  message: trimmed(4000).optional(),
  page_path: trimmed(240).optional(),
  documents: z
    .array(declaredDocumentSchema)
    .min(1, 'Add the contract first — a PDF or a photo of each page.')
    .max(20),
  company: honeypot,
});

/** The pages that finished uploading, to be linked in the office's email. */
export const confirmQuoteDocumentsSchema = z.object({
  lead_id: z.uuid('Unknown request.'),
  documents: z
    .array(
      z.object({
        path: z.string().trim().min(1).max(300),
        name: z.string().trim().min(1).max(255),
      }),
    )
    .min(1)
    .max(20),
});

export type LeadInput = z.infer<typeof leadSchema>;
export type ContractQuoteInput = z.infer<typeof contractQuoteSchema>;
export type OrderInput = z.infer<typeof orderSchema>;
export type ConfirmDocumentsInput = z.infer<typeof confirmDocumentsSchema>;

/** Flattens Zod issues into `{ field: message }` for rendering next to inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}
