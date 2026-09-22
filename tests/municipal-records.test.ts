/**
 * The city records.
 *
 * A city page quotes its municipality and links each quotation to the page it
 * was read from. A record that names a city the list does not carry, a quote
 * with no source, an http link or a date that is not a date would each put a
 * sentence on a page with nothing behind it — which is the one thing the site
 * is built to prevent. The shape is asserted here so the data file cannot
 * drift from the rule.
 */
import { describe, expect, it } from 'vitest';

import { FLORIDA_CITIES } from '@/lib/florida-cities';
import {
  MUNICIPAL_RECORDS,
  municipalRecord,
  withheldMunicipalFacts,
  type CityQuote,
} from '@/lib/municipal-records';

function quotesOf(record: (typeof MUNICIPAL_RECORDS)[number]): CityQuote[] {
  return [
    record.building?.expiredPermits,
    record.codeEnforcement?.hearingBody,
    record.codeEnforcement?.liens,
    record.codeEnforcement?.release,
    record.lienSearch?.how,
    record.lienSearch?.fee,
    record.lienSearch?.turnaround,
    record.utility?.statement,
    ...record.other.map((item) => item.quote),
  ].filter((quote): quote is CityQuote => Boolean(quote));
}

function officesOf(record: (typeof MUNICIPAL_RECORDS)[number]) {
  return [
    record.building?.office,
    record.building?.portal,
    record.codeEnforcement?.office,
    record.lienSearch?.office,
    record.utility?.provider,
  ].filter((office): office is { name: string; url: string } => Boolean(office));
}

describe('the city records', () => {
  it('each belong to a city that has a page, once', () => {
    const slugs = new Set(FLORIDA_CITIES.map((city) => city.slug));
    const seen = new Set<string>();
    for (const record of MUNICIPAL_RECORDS) {
      expect(slugs.has(record.citySlug), record.citySlug).toBe(true);
      expect(seen.has(record.citySlug), `${record.citySlug} twice`).toBe(false);
      seen.add(record.citySlug);
    }
  });

  it('name the municipality without an article, so the page can supply one', () => {
    for (const record of MUNICIPAL_RECORDS) {
      expect(record.government).toMatch(/^City of /);
    }
  });

  it('carry a source and a date on every quotation, and say nothing empty', () => {
    for (const record of MUNICIPAL_RECORDS) {
      const quotes = quotesOf(record);
      expect(quotes.length, `${record.citySlug} says nothing`).toBeGreaterThan(0);
      for (const quote of quotes) {
        expect(quote.text.trim().length, quote.sourceUrl).toBeGreaterThan(20);
        expect(quote.sourceUrl).toMatch(/^https:\/\//);
        expect(quote.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        // A quotation is the city's words; a VERIFY flag is ours.
        expect(quote.text).not.toMatch(/\[VERIFY/);
      }
    }
  });

  it('link every office and portal over https', () => {
    for (const record of MUNICIPAL_RECORDS) {
      for (const office of officesOf(record)) {
        expect(office.name.trim().length).toBeGreaterThan(0);
        expect(office.url, `${record.citySlug}: ${office.name}`).toMatch(/^https:\/\//);
      }
    }
  });

  it('read only from government sites', () => {
    // A city's own domain, a county's, or a portal the city links from its own
    // pages. Never a title-industry blog or a lien-search vendor.
    const allowed =
      /^https:\/\/([a-z0-9-]+\.)*(gov|us|org|com|net)(\/|$)/i;
    const banned = /(deeds\.com|wikipedia|blog|lienvendor|propertyshark)/i;
    for (const record of MUNICIPAL_RECORDS) {
      for (const url of [...quotesOf(record).map((q) => q.sourceUrl), ...officesOf(record).map((o) => o.url)]) {
        expect(url).toMatch(allowed);
        expect(url).not.toMatch(banned);
      }
    }
  });
});

describe('what a page withholds', () => {
  it('is everything, for a city with no record', () => {
    const items = withheldMunicipalFacts('Nowhere', null);
    expect(items).toHaveLength(8);
    expect(items[0]).toBe('Where the City of Nowhere publishes permit status and history online');
  });

  it('is only what the record lacks, for a city with one', () => {
    const record = municipalRecord('st-petersburg');
    expect(record).not.toBeNull();
    // St. Petersburg publishes its portal, its hearing body, its release
    // route, its lien search's fee and turnaround, and its utility.
    expect(withheldMunicipalFacts('St. Petersburg', record)).toEqual([]);
  });

  it('does not ask a city with no lien-search service for its fee', () => {
    const record = municipalRecord('orlando');
    expect(record?.lienSearch?.answeredBy).toBe('self-service');
    const items = withheldMunicipalFacts('Orlando', record);
    expect(items.some((item) => /charges for a municipal lien search/.test(item))).toBe(false);
    expect(items.some((item) => /how long/i.test(item))).toBe(false);
  });

  it('knows nothing about a slug that is not a city', () => {
    expect(municipalRecord('pennsylvania')).toBeNull();
  });
});
