// Shared validation for the public form endpoints. The same schema runs in the
// browser for immediate feedback and in the Route Handler as the real gate —
// client-side validation is a convenience, never the boundary.

import { z } from 'zod';

const trimmed = (max: number) => z.string().trim().max(max);

/** Currency arriving as a string from a form field. Empty means "not provided". */
const optionalMoney = z
  .union([z.string(), z.number()])
  .optional()
  .transform((value) => {
    if (value === undefined || value === '') return undefined;
    const parsed = Number(String(value).replace(/[$,\s]/g, ''));
    return Number.isFinite(parsed) ? parsed : undefined;
  })
  .refine((value) => value === undefined || (value >= 0 && value < 1_000_000_000), {
    message: 'Enter an amount as a number.',
  });

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
  company: honeypot,
});

export type LeadInput = z.infer<typeof leadSchema>;
export type OrderInput = z.infer<typeof orderSchema>;

/** Flattens Zod issues into `{ field: message }` for rendering next to inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}
