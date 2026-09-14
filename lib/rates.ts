// Recording service charges and the taxes collected at recording, read at build
// time with the service role. Fails soft: if Supabase is unreachable the county
// pages fall back to saying the figures are not loaded rather than to a guess.
//
// Every row carries its own source URL. Nothing in this module invents,
// averages or interpolates a figure — see supabase/seed/rate_tables.sql.
import 'server-only';

import { cache } from 'react';
import { getServiceClient } from './supabase';

export interface Rate {
  key: string;
  label: string;
  /** Dollars; read against `unit` to know what the dollars are per. */
  value: number;
  unit: RateUnit;
  /** Null means the figure applies in all 67 counties. */
  countySlug: string | null;
  sourceUrl: string;
  sourceNote: string | null;
  /** The date this figure was checked against its source, not a rate change. */
  effectiveFrom: string;
}

/**
 * `usd` is a flat charge, `usd_per_100` is per $100 of consideration or debt
 * (counting a fraction of $100 as a full $100), `usd_per_dollar` is a rate
 * applied to every dollar.
 */
export type RateUnit = 'usd' | 'usd_per_100' | 'usd_per_dollar';

const KNOWN_UNITS: readonly RateUnit[] = ['usd', 'usd_per_100', 'usd_per_dollar'];

/** Display order. A key not listed here still renders, after the listed ones. */
const RECORDING_ORDER = [
  'recording_first_page',
  'recording_additional_page',
  'recording_extra_name',
  'recording_court_instrument_first_page',
  'recording_court_instrument_additional_page',
  'recording_plat_first_page',
  'recording_plat_additional_page',
  'recording_certified_copy',
  'recording_copy_page',
  'recording_copy_oversize_page',
  'recording_record_search',
] as const;

const TAX_ORDER = [
  'tax_doc_stamps_deed',
  'tax_doc_stamps_surtax',
  'tax_doc_stamps_mortgage',
  'tax_intangible_mortgage',
  'tax_doc_stamps_note_cap',
] as const;

export interface CountyRates {
  /** What the recording office charges, in display order. */
  recording: Rate[];
  /** Documentary stamps, surtax and intangible tax, in display order. */
  taxes: Rate[];
  /** Keys whose figure departs from the statewide one in this county. */
  localKeys: string[];
  get(key: string): Rate | null;
}

// Single string literal on purpose — see the note in lib/reviews.ts.
const SELECT_COLUMNS =
  'key, county_slug, label, numeric_value, unit, source_url, source_note, effective_from' as const;

export const getRates = cache(async (): Promise<Rate[]> => {
  const supabase = getServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('rate_tables')
    .select(SELECT_COLUMNS)
    // A superseded figure is retired by setting effective_to rather than by
    // being edited in place, so the current set is the open-ended rows.
    .is('effective_to', null)
    .order('key');

  if (error) {
    console.warn(`[rates] fetch failed, county pages will withhold figures: ${error.message}`);
    return [];
  }

  return data.flatMap((row) => {
    // A row with no amount, or with a unit this code does not know how to
    // render, would print as "$NaN" or as a bare number with no basis. Drop it
    // and say so: a fee figure that renders wrongly on a title agency's site is
    // worse than one that is absent.
    if (row.numeric_value === null) {
      console.warn(`[rates] skipping "${row.key}": no numeric_value`);
      return [];
    }
    if (!KNOWN_UNITS.includes(row.unit as RateUnit)) {
      console.warn(`[rates] skipping "${row.key}": unrecognised unit "${row.unit}"`);
      return [];
    }

    return [
      {
        key: row.key,
        label: row.label,
        value: Number(row.numeric_value),
        unit: row.unit as RateUnit,
        countySlug: row.county_slug,
        sourceUrl: row.source_url,
        sourceNote: row.source_note,
        effectiveFrom: row.effective_from,
      },
    ];
  });
});

function sortByOrder(rates: Rate[], order: readonly string[]): Rate[] {
  return [...rates].sort((a, b) => {
    const ai = order.indexOf(a.key);
    const bi = order.indexOf(b.key);
    return (ai === -1 ? order.length : ai) - (bi === -1 ? order.length : bi);
  });
}

/**
 * The figures in force in one county: the statewide set, with any county row
 * for the same key taking its place.
 *
 * Recording charges are statewide because Fla. Stat. s. 28.24 caps what any
 * clerk may charge, so a county row here means a real local departure — in
 * Florida today that is Miami-Dade's deed rate and its surtax, and nothing else.
 */
export async function getCountyRates(countySlug: string): Promise<CountyRates> {
  const all = await getRates();

  const merged = new Map<string, Rate>();
  for (const rate of all.filter((rate) => rate.countySlug === null)) {
    merged.set(rate.key, rate);
  }
  const localKeys: string[] = [];
  for (const rate of all.filter((rate) => rate.countySlug === countySlug)) {
    merged.set(rate.key, rate);
    localKeys.push(rate.key);
  }

  const rates = [...merged.values()];

  return {
    recording: sortByOrder(
      rates.filter((rate) => rate.key.startsWith('recording_')),
      RECORDING_ORDER,
    ),
    taxes: sortByOrder(
      rates.filter((rate) => rate.key.startsWith('tax_')),
      TAX_ORDER,
    ),
    localKeys,
    get: (key: string) => merged.get(key) ?? null,
  };
}

/** The figures that apply in every county, before any local departure. */
export async function getStatewideRates(): Promise<CountyRates> {
  // No county slug matches, so nothing overlays the statewide rows.
  return getCountyRates('');
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const usdWhole = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function formatMoney(amount: number): string {
  return Number.isInteger(amount) ? usdWhole.format(amount) : usd.format(amount);
}

/** "$10.00", "$0.70 per $100", "$0.002 per $1 (2 mills)". */
export function formatRate(rate: Rate): string {
  switch (rate.unit) {
    case 'usd_per_100':
      return `${usd.format(rate.value)} per $100`;
    case 'usd_per_dollar':
      // Mills are how the statute and every lender's fee sheet express this, so
      // print both rather than leaving a reader to convert 0.002 in their head.
      // Intl's currency format would round 0.002 to $0.00, so format the number
      // itself and prefix the sign.
      return `$${rate.value} per $1 (${rate.value * 1000} mills)`;
    case 'usd':
    default:
      return usd.format(rate.value);
  }
}

/**
 * Tax on a sum at a per-$100 rate.
 *
 * Fla. Stat. ss. 201.02(1)(a) and 201.08(1)(b) tax "each $100 or fraction
 * thereof", so a $499,950 price is taxed as 5,000 hundreds, not 4,999.5. Round
 * the count of hundreds up, never the dollars.
 */
function per100(amount: number, rate: number): number {
  return Math.ceil(amount / 100) * rate;
}

export interface ClosingTaxes {
  deedDocStamps: number;
  /** Null where the county levies no surtax, or where the transfer is exempt. */
  surtax: number | null;
  mortgageDocStamps: number | null;
  intangibleTax: number | null;
  total: number;
}

/**
 * What the recording office collects in tax on one transaction.
 *
 * Arithmetic on the stored rates and nothing else. It is not a quote and does
 * not include the promulgated premium, the search, or the agency's own charges.
 */
export function estimateClosingTaxes(
  rates: CountyRates,
  {
    purchasePrice,
    loanAmount = 0,
    isSingleFamilyResidence = true,
  }: { purchasePrice: number; loanAmount?: number; isSingleFamilyResidence?: boolean },
): ClosingTaxes | null {
  const deedRate = rates.get('tax_doc_stamps_deed');
  if (!deedRate) return null;

  const surtaxRate = rates.get('tax_doc_stamps_surtax');
  const mortgageRate = rates.get('tax_doc_stamps_mortgage');
  const intangibleRate = rates.get('tax_intangible_mortgage');

  const deedDocStamps = per100(purchasePrice, deedRate.value);
  // The surtax reaches a transfer of anything other than a single-family
  // residence. A condominium unit, a co-op unit and a detached dwelling are all
  // single-family for this purpose — see the source note on the stored rate.
  const surtax =
    surtaxRate && !isSingleFamilyResidence ? per100(purchasePrice, surtaxRate.value) : null;
  const mortgageDocStamps =
    loanAmount > 0 && mortgageRate ? per100(loanAmount, mortgageRate.value) : null;
  const intangibleTax =
    loanAmount > 0 && intangibleRate
      ? Math.round(loanAmount * intangibleRate.value * 100) / 100
      : null;

  return {
    deedDocStamps,
    surtax,
    mortgageDocStamps,
    intangibleTax,
    total:
      deedDocStamps + (surtax ?? 0) + (mortgageDocStamps ?? 0) + (intangibleTax ?? 0),
  };
}
