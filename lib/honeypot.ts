/**
 * The name of the hidden field that bots fill in and people never see.
 *
 * The name means nothing to autofill. It used to be `company`, which browsers
 * and password managers fill in on their own — and every real order they
 * touched was answered "received" and thrown away.
 *
 * A module of its own so the form components can name the field without
 * importing lib/schemas, which would put zod in the page's first download.
 */
export const HONEYPOT_FIELD = 'ref_note';
