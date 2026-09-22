/**
 * What the estimator's boxes accept, and what its address carries.
 *
 * Before this the money boxes kept the digits and threw everything else away,
 * so "450,000.00" became $45,000,000 and "1e6" became $16 — and a figure a
 * hundred times too large is exactly the kind a reader might believe.
 */
import { describe, expect, it } from 'vitest';

import { DEFAULTS, estimate } from '@/lib/closing-estimate';
import {
  MAX_AMOUNT,
  caretAfterFormat,
  clearNumbers,
  formatDraft,
  parseMoney,
  parsePageCount,
  readNumbers,
  summaryText,
  writeNumbers,
  type NumbersState,
} from '@/lib/estimate-input';

describe('a money box', () => {
  it.each([
    ['450000', 450_000],
    ['450,000', 450_000],
    ['$450,000', 450_000],
    [' 450 000 ', 450_000],
    // The cents are dropped at the point, not read as more dollars.
    ['450,000.00', 450_000],
    ['450000.99', 450_000],
    ['450000.', 450_000],
    ['.5', 0],
    ['', 0],
    ['0007', 7],
  ])('reads %j as %i', (raw, value) => {
    expect(parseMoney(raw)).toEqual({ ok: true, value });
  });

  it.each(['1e6', '1E6', '-5', '12a', '1.2.3', 'Infinity', 'NaN', '0x10'])('refuses %j', (raw) => {
    expect(parseMoney(raw)).toEqual({ ok: false, reason: 'characters' });
  });

  it('stops at the cap, and never becomes Infinity on a long paste', () => {
    expect(parseMoney(String(MAX_AMOUNT))).toEqual({ ok: true, value: MAX_AMOUNT });
    expect(parseMoney(String(MAX_AMOUNT + 1))).toEqual({ ok: false, reason: 'too-large' });
    expect(parseMoney('9'.repeat(400))).toEqual({ ok: false, reason: 'too-large' });
  });

  it('keeps a typed point on screen while the reader is still in the box', () => {
    expect(formatDraft('450000')).toBe('450,000');
    expect(formatDraft('450000.')).toBe('450,000.');
    expect(formatDraft('4500005.5')).toBe('4,500,005.5');
  });

  it('keeps the caret beside the digit it was after when a comma appears', () => {
    // "4500|0" is re-commaed as "45,00|0", rather than the caret jumping to the end.
    expect(caretAfterFormat('45000', 4, '45,000')).toBe(5);
    // "123|4,567" is re-commaed as "1,23|4,567", still after the 3.
    expect(caretAfterFormat('1234,567', 3, '1,234,567')).toBe(4);
    expect(caretAfterFormat('450000.5', 8, '450,000.5')).toBe(9);
    expect(caretAfterFormat('', 0, '')).toBe(0);
  });
});

describe('a page box', () => {
  it('takes whole pages up to 500', () => {
    expect(parsePageCount('3')).toEqual({ ok: true, value: 3 });
    expect(parsePageCount('500')).toEqual({ ok: true, value: 500 });
    expect(parsePageCount('')).toEqual({ ok: true, value: 0 });
    expect(parsePageCount('501')).toEqual({ ok: false, reason: 'too-large' });
    expect(parsePageCount('2.5')).toEqual({ ok: false, reason: 'characters' });
    expect(parsePageCount('-1')).toEqual({ ok: false, reason: 'characters' });
  });
});

describe('the numbers in the address bar', () => {
  const counties = ['broward-county', 'miami-dade-county', 'elsewhere'];
  const state: NumbersState = {
    purpose: 'refinance',
    party: 'seller',
    county: 'miami-dade-county',
    price: 725_000,
    loan: 610_000,
    reissue: true,
    prior: 300_000,
    singleFamily: false,
    deedPages: 4,
    mortgagePages: 18,
  };

  it('comes back as it went in', () => {
    const params = writeNumbers(new URLSearchParams(), state);
    expect(readNumbers(params, counties)).toEqual(state);
  });

  it('leaves the mode, and anything else, where it was', () => {
    const params = writeNumbers(new URLSearchParams('mode=numbers&utm_source=x'), state);
    expect(params.get('mode')).toBe('numbers');
    expect(params.get('utm_source')).toBe('x');

    const cleared = clearNumbers(params);
    expect(cleared.toString()).toBe('mode=numbers&utm_source=x');
  });

  it('ignores whatever it could not have written', () => {
    const read = readNumbers(
      new URLSearchParams(
        'tx=lease&side=agent&county=atlantis&price=1e6&loan=-5&prior=999999999999&reissue=yes&sfr=2&deed=0&mortgage=9000',
      ),
      counties,
    );
    expect(read).toEqual({});
  });

  it('takes only whole dollars from a link, which is all it ever writes', () => {
    expect(readNumbers(new URLSearchParams('price=450000.00'), counties)).toEqual({});
    expect(readNumbers(new URLSearchParams('price=450000'), counties)).toEqual({ price: 450_000 });
  });
});

describe('the copied summary', () => {
  it('carries every line, its citation and the page it came from', () => {
    const priced = estimate(DEFAULTS);
    const text = summaryText({
      title: 'Closing cost estimate',
      sub: 'A purchase in Broward County.',
      totalLabel: 'The buyer’s side',
      total: priced.total,
      groups: priced.groups,
      foot: ['Not in it: our settlement fee.'],
      url: 'https://www.bayittitle.com/estimate?mode=numbers',
    });

    expect(text).toContain('The buyer’s side: $5,152.00');
    expect(text).toContain('Owner’s policy, original rate: $2,575.00 (Fla. Admin. Code R. 69O-186.003(1)(a))');
    expect(text).toContain('E-recording the deed: $5.50');
    expect(text.trim().endsWith('https://www.bayittitle.com/estimate?mode=numbers')).toBe(true);
  });
});
