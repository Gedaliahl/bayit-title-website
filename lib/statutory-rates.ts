// Transfer taxes and recording charges, taken from the text of the statute that
// sets each one and cited to it. Read from Online Sunshine on the CHECKED_ON
// date below.
//
// These are not county figures. The Legislature sets them and they are the same
// in all 67 counties, with one exception that is itself written into the statute
// (s. 201.0205, below). A county page should state them and cite them, not flag
// them as something the office has to look up locally.
//
// Nothing here is a Bayit Title price. The promulgated premium schedule is a
// different thing and is not in this file — see README, known blockers.

import type { CitedFigure } from './cited-figures';

/** The date each figure below was last read from the statute itself. */
export const CHECKED_ON = '2026-09-14';

const SUNSHINE = 'https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=';

const statute = (path: string) => `${SUNSHINE}${path}`;

const URLS = {
  s20102: statute('0200-0299/0201/Sections/0201.02.html'),
  s2010205: statute('0200-0299/0201/Sections/0201.0205.html'),
  s201031: statute('0200-0299/0201/Sections/0201.031.html'),
  s20108: statute('0200-0299/0201/Sections/0201.08.html'),
  s1250167: statute('0100-0199/0125/Sections/0125.0167.html'),
  s199133: statute('0100-0199/0199/Sections/0199.133.html'),
  s2824: statute('0000-0099/0028/Sections/0028.24.html'),
} as const;

/**
 * The 10-cent increase in s. 2, ch. 92-317 does not apply in a county that
 * implemented ch. 83-220, so the deed rate there is 60 cents rather than 70.
 * The statute names no county; the Department of Revenue publishes that
 * Miami-Dade is the one county it describes, which is why the rate is keyed to
 * a slug here and not inferred from anything on the page.
 */
const CH_83_220_COUNTIES = new Set(['miami-dade-county']);

export const DOR_DOC_STAMP_GUIDANCE =
  'https://floridarevenue.com/taxes/taxesfees/Pages/doc_stamp.aspx';

/** Documentary stamp tax on the deed, which is the one figure that varies. */
export function deedStampTax(countySlug: string): CitedFigure {
  if (CH_83_220_COUNTIES.has(countySlug)) {
    return {
      label: 'Documentary stamp tax on the deed',
      amount: '60¢ per $100 of consideration, or part of $100',
      cite: 'Fla. Stat. §§ 201.02(1)(a), 201.0205',
      sourceUrl: URLS.s2010205,
      note: 'Lower than the rest of Florida because the 10-cent increase in ch. 92-317 was never applied here.',
    };
  }

  return {
    label: 'Documentary stamp tax on the deed',
    amount: '70¢ per $100 of consideration, or part of $100',
    cite: 'Fla. Stat. § 201.02(1)(a)',
    sourceUrl: URLS.s20102,
    note: 'Charged on each part of $100, so the figure rounds up, not down.',
  };
}

/** Levied only by a county defined in s. 125.011(1) — in practice, Miami-Dade. */
export function discretionarySurtax(countySlug: string): CitedFigure | null {
  if (!CH_83_220_COUNTIES.has(countySlug)) return null;

  return {
    label: 'County discretionary surtax',
    amount: '45¢ per $100 of consideration, or part of $100',
    cite: 'Fla. Stat. §§ 201.031, 125.0167',
    sourceUrl: URLS.s201031,
    note: 'Not charged where the interest conveyed involves only a single-family residence.',
  };
}

/** Charged on the loan, not the sale, so it is absent from a cash closing. */
export const MORTGAGE_CHARGES: CitedFigure[] = [
  {
    label: 'Documentary stamp tax on the mortgage',
    amount: '35¢ per $100 of the amount secured, or part of $100',
    cite: 'Fla. Stat. § 201.08(1)(b)',
    sourceUrl: URLS.s20108,
    note: 'The $2,450 cap in § 201.08(1)(a) is on the tax on a note or other written obligation to pay money. There is no cap on the tax on a mortgage recorded against Florida property.',
  },
  {
    label: 'Nonrecurring intangible tax',
    amount: '2 mills on each dollar secured — $2 per $1,000',
    cite: 'Fla. Stat. § 199.133(1)',
    sourceUrl: URLS.s199133,
    note: 'One time, on the obligation the mortgage secures.',
  },
];

/**
 * s. 28.24(13) charges a deed or mortgage three ways per page and every clerk
 * adds them up the same: (a) $5.00 + (d)1. $1.00 + (e) $4.00 for the first
 * page, and (b) $4.00 + (d)2. $0.50 + (e) $4.00 for each one after it.
 */
export const RECORDING_CHARGES: CitedFigure[] = [
  {
    label: 'Recording, first page',
    amount: '$10.00',
    cite: 'Fla. Stat. § 28.24(13)(a), (d)1., (e)',
    sourceUrl: URLS.s2824,
    note: '$5.00 service charge, plus $1.00 to the Public Records Modernization Trust Fund, plus $4.00.',
  },
  {
    label: 'Recording, each page after the first',
    amount: '$8.50',
    cite: 'Fla. Stat. § 28.24(13)(b), (d)2., (e)',
    sourceUrl: URLS.s2824,
    note: '$4.00 service charge, plus 50¢ to the trust fund, plus $4.00.',
  },
  {
    label: 'Indexing, per name over four',
    amount: '$1.00',
    cite: 'Fla. Stat. § 28.24(13)(c)',
    sourceUrl: URLS.s2824,
    note: 'Reached by a deed with several grantors, or by a mortgage naming a trust.',
  },
];

/**
 * The worked examples on a county page. One price and one loan, used
 * everywhere, so a reader comparing two counties is comparing the rate.
 */
export const EXAMPLE_PRICE = 500_000;
export const EXAMPLE_LOAN = 400_000;

const toCents = (value: number) => Math.round(value * 100) / 100;

/**
 * "Each $100 or fractional part thereof" — the count of hundreds rounds up, so
 * a $500,050 sale is taxed on 5,001 hundreds, not 5,000.5.
 */
const hundreds = (amount: number) => Math.ceil(amount / 100);

export function deedStampTaxDue(consideration: number, countySlug: string): number {
  return toCents(hundreds(consideration) * (CH_83_220_COUNTIES.has(countySlug) ? 0.6 : 0.7));
}

export function discretionarySurtaxDue(consideration: number, countySlug: string): number {
  if (!CH_83_220_COUNTIES.has(countySlug)) return 0;
  return toCents(hundreds(consideration) * 0.45);
}

export function mortgageStampTaxDue(amountSecured: number): number {
  return toCents(hundreds(amountSecured) * 0.35);
}

/** 2 mills on each dollar, so no rounding up to a hundred here. */
export function intangibleTaxDue(amountSecured: number): number {
  return toCents(amountSecured * 0.002);
}

export function formatMoney(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  });
}

/** $10.00 for the first page and $8.50 for each one after it. */
export function recordingChargeDue(pages: number): number {
  return toCents(10 + Math.max(0, pages - 1) * 8.5);
}
