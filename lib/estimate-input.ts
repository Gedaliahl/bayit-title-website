// What a reader types into the estimator, turned into numbers the arithmetic
// can trust, and the numbers turned back into something they can keep.
//
// The boxes take whole dollars. A premium is rated on the next $100 up and a
// tax on each $100 or part of one, so cents never change a figure — but a
// pasted "450,000.00" read as digits alone is $45,000,000, and every line on
// the card a hundred times too large. So the cents are dropped at the point,
// not folded into the dollars, and anything that is not a number is refused
// rather than guessed at.

import { MAX_PAGES } from './closing-estimate';
import type { EstimateGroup } from './closing-estimate';
import { formatCents } from './statutory-rates';

/** Past this a figure is far likelier to be a slip on the keyboard than a price. */
export const MAX_AMOUNT = 100_000_000;

export type Refusal = 'characters' | 'too-large';

export type Parsed = { ok: true; value: number } | { ok: false; reason: Refusal };

/** "$1,250.75" → the parts a box is made of, or null if it is not a number at all. */
function split(raw: string): { whole: string; fraction: string | null } | null {
  const text = raw.replace(/[\s$,]/g, '');
  const match = /^(\d*)(?:\.(\d*))?$/.exec(text);
  if (!match) return null;
  return { whole: match[1].replace(/^0+(?=\d)/, ''), fraction: match[2] ?? null };
}

/**
 * Whole dollars from what is in the box. Digits, commas, a `$` and one decimal
 * point are allowed; the point and whatever follows it are dropped. An
 * exponent, a minus sign or a letter is refused, and so is anything over
 * MAX_AMOUNT — the caller keeps the last good figure and says why.
 */
export function parseMoney(raw: string): Parsed {
  const parts = split(raw);
  if (!parts) return { ok: false, reason: 'characters' };
  if (parts.whole === '') return { ok: true, value: 0 };
  // Checked on length first, so a 400-digit paste never becomes Infinity.
  if (parts.whole.length > String(MAX_AMOUNT).length) return { ok: false, reason: 'too-large' };
  const value = Number(parts.whole);
  return value > MAX_AMOUNT ? { ok: false, reason: 'too-large' } : { ok: true, value };
}

/**
 * The box as it should read while the reader is still in it: commas in the
 * dollars, and a decimal point they have typed kept where they put it, so the
 * next keystroke does not land in the dollars. The cents go when they leave.
 */
export function formatDraft(raw: string): string {
  const parts = split(raw);
  if (!parts) return raw;
  const whole = parts.whole === '' ? '' : Number(parts.whole).toLocaleString('en-US');
  return parts.fraction === null ? whole : `${whole}.${parts.fraction}`;
}

/** The box once the reader has left it. */
export function formatAmount(value: number): string {
  return value === 0 || !Number.isFinite(value) ? '' : value.toLocaleString('en-US');
}

/**
 * Where the caret belongs after the box is reformatted. Counted in the
 * characters that survive formatting — digits and the point — so a comma
 * appearing to the left of the caret does not push it back to the end.
 */
export function caretAfterFormat(raw: string, caret: number, formatted: string): number {
  const before = split(raw.slice(0, caret));
  const keep = before
    ? before.whole.length + (before.fraction === null ? 0 : 1 + before.fraction.length)
    : raw.slice(0, caret).replace(/[^\d.]/g, '').length;

  let seen = 0;
  for (let index = 0; index < formatted.length; index++) {
    if (seen === keep) return index;
    if (formatted[index] !== ',') seen++;
  }
  return formatted.length;
}

/**
 * Pages in a document. Digits only, up to MAX_PAGES. An empty box is 0 here
 * and priced as one page by the estimate, which says so under the box.
 */
export function parsePageCount(raw: string): Parsed {
  const text = raw.trim();
  if (!/^\d*$/.test(text)) return { ok: false, reason: 'characters' };
  if (text === '') return { ok: true, value: 0 };
  const value = Number(text.replace(/^0+(?=\d)/, ''));
  return text.length > 3 || value > MAX_PAGES ? { ok: false, reason: 'too-large' } : { ok: true, value };
}

/** What the numbers option holds, which is also what its address carries. */
export interface NumbersState {
  purpose: 'purchase' | 'refinance';
  party: 'buyer' | 'seller';
  county: string;
  price: number;
  loan: number;
  reissue: boolean;
  prior: number;
  singleFamily: boolean;
  deedPages: number;
  mortgagePages: number;
}

/**
 * Short, and never the same as a key the rest of the page uses: `mode` belongs
 * to the tabs, and is left alone in both directions.
 */
const KEYS = {
  purpose: 'tx',
  party: 'side',
  county: 'county',
  price: 'price',
  loan: 'loan',
  reissue: 'reissue',
  prior: 'prior',
  singleFamily: 'sfr',
  deedPages: 'deed',
  mortgagePages: 'mortgage',
} as const satisfies Record<keyof NumbersState, string>;

export const NUMBERS_KEYS: string[] = Object.values(KEYS);

/**
 * The numbers in a shared or refreshed address. Anything missing, misspelt or
 * out of range is simply not returned, so a bad link opens on the defaults
 * rather than on a figure nobody typed.
 */
export function readNumbers(params: URLSearchParams, counties: string[]): Partial<NumbersState> {
  const read: Partial<NumbersState> = {};

  const purpose = params.get(KEYS.purpose);
  if (purpose === 'purchase' || purpose === 'refinance') read.purpose = purpose;

  const party = params.get(KEYS.party);
  if (party === 'buyer' || party === 'seller') read.party = party;

  const county = params.get(KEYS.county);
  if (county && counties.includes(county)) read.county = county;

  for (const key of ['price', 'loan', 'prior'] as const) {
    const raw = params.get(KEYS[key]);
    if (raw === null || !/^\d+$/.test(raw)) continue;
    const parsed = parseMoney(raw);
    if (parsed.ok) read[key] = parsed.value;
  }

  for (const key of ['reissue', 'singleFamily'] as const) {
    const raw = params.get(KEYS[key]);
    if (raw === '1' || raw === '0') read[key] = raw === '1';
  }

  for (const key of ['deedPages', 'mortgagePages'] as const) {
    const raw = params.get(KEYS[key]);
    if (raw === null) continue;
    const parsed = parsePageCount(raw);
    if (parsed.ok && parsed.value >= 1) read[key] = parsed.value;
  }

  return read;
}

/** Writes the numbers into `params`, leaving every other key where it was. */
export function writeNumbers(params: URLSearchParams, state: NumbersState): URLSearchParams {
  const next = new URLSearchParams(params);
  next.set(KEYS.purpose, state.purpose);
  next.set(KEYS.party, state.party);
  next.set(KEYS.county, state.county);
  next.set(KEYS.price, String(state.price));
  next.set(KEYS.loan, String(state.loan));
  next.set(KEYS.reissue, state.reissue ? '1' : '0');
  next.set(KEYS.prior, String(state.prior));
  next.set(KEYS.singleFamily, state.singleFamily ? '1' : '0');
  next.set(KEYS.deedPages, String(state.deedPages));
  next.set(KEYS.mortgagePages, String(state.mortgagePages));
  return next;
}

/** Removes the numbers, for when the reader has moved to another option. */
export function clearNumbers(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const key of NUMBERS_KEYS) next.delete(key);
  return next;
}

/**
 * The card as plain text, for pasting into an email or a note. Every line
 * keeps its citation, because a figure without one is only a number, and the
 * page address goes at the foot so whoever reads it can open the same figures.
 */
export function summaryText({
  title,
  sub,
  totalLabel,
  total,
  groups,
  foot,
  url,
}: {
  title: string;
  sub: string;
  totalLabel: string;
  total: number;
  groups: EstimateGroup[];
  foot: string[];
  url: string;
}): string {
  const lines = [title, sub, '', `${totalLabel}: ${formatCents(total)}`];

  for (const group of groups) {
    lines.push('', group.title);
    for (const line of group.lines) {
      lines.push(`  ${line.label}: ${formatCents(line.value)} (${line.cite})`);
    }
  }

  lines.push('', ...foot, '', url);
  return lines.join('\n');
}
