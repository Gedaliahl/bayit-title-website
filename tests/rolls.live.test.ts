/**
 * Does every county service in lib/county-rolls.ts still answer?
 *
 * Excluded from `npm test` on purpose — it makes a few hundred requests to
 * sixty other offices' servers and fails when one of them is down, which is
 * not a thing about this code. Run it with `npm run check:rolls` before
 * trusting the registry after a few months, and after adding a county.
 *
 * What it proves per county, which is what an entry claims:
 *   1. The service answers, and the columns named in the entry exist on it.
 *   2. An address search against it returns rows — the query this code builds,
 *      not a query written for the test.
 *   3. Those rows carry money, or a parcel number the statewide roll can be
 *      read with. An entry that produces neither is a county where the reader
 *      would pick a property and get an empty box.
 */
import { describe, expect, it } from 'vitest';

import { COUNTY_ROLLS, type CountyRoll } from '@/lib/county-rolls';
import { outFieldsOf, queryRoll, readRow, resolveParcelValue } from '@/lib/property-lookup';
import { parseTypedAddress } from '@/lib/address-format';

const TIMEOUT_MS = 25_000;

async function query(roll: CountyRoll, params: Record<string, string>) {
  const url = `${roll.serviceUrl}?${new URLSearchParams({
    returnGeometry: 'false',
    f: 'json',
    ...params,
  })}`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: 'application/json' },
  });

  expect(response.ok, `${roll.countyName}: HTTP ${response.status}`).toBe(true);

  const payload = (await response.json()) as {
    features?: { attributes?: Record<string, unknown> }[];
    error?: { message?: string };
  };

  expect(payload.error?.message, `${roll.countyName}: ${payload.error?.message}`).toBeUndefined();
  return payload.features ?? [];
}

/** The address column, whichever shape the entry is. */
const addressColumn = (roll: CountyRoll) =>
  roll.address.kind === 'line' ? roll.address.field : roll.address.nameField;

describe.each(COUNTY_ROLLS.map((roll) => [roll.countyName, roll] as const))(
  '%s',
  (_name, roll) => {
    it('answers an address search the way the site makes one', async () => {
      // An address the county itself publishes, so the search is for something
      // that is certainly there.
      const sample = await query(roll, {
        where: `${addressColumn(roll)} IS NOT NULL`,
        outFields: outFieldsOf(roll).join(','),
        resultRecordCount: '8',
      });

      expect(sample.length, 'no rows at all').toBeGreaterThan(0);

      const known = sample
        .map((row) => (row.attributes ? readRow(roll, row.attributes) : null))
        .find((row) => row !== null && /^\d/.test(row.address));

      // A layer whose sampled rows are all unnumbered — rights of way, say —
      // has nothing to search for. That is its shape, not a failure.
      if (!known) return;

      // The real path: the query this code builds, read the way it reads it.
      const suggestions = await queryRoll(roll, parseTypedAddress(known.address), known.address);

      expect(
        suggestions.length,
        `searching "${known.address}" produced no suggestion`,
      ).toBeGreaterThan(0);

      const first = suggestions[0];
      expect(first.address.length).toBeGreaterThan(0);
      expect(first.countySlug).toBe(roll.countySlug);

      // Every suggestion has to lead to a figure: carried in the row, or
      // fetchable from the statewide roll. Neither means a reader picks a
      // property and gets an empty box.
      const priced = suggestions.some(
        (suggestion) =>
          suggestion.assessedValue || suggestion.justValue || suggestion.valueLookup,
      );
      expect(priced, 'suggestions carry neither a figure nor a way to fetch one').toBe(true);
    });

    it('produces a figure for most of the addresses on it', async () => {
      // Two samples rather than one. A layer's natural order is its oldest
      // records, which in a rural county is rights of way and farmland; rows
      // whose address starts with a 1 are a different, equally arbitrary
      // slice. Between them they are closer to what a reader will type.
      const [head, ones] = await Promise.all([
        query(roll, {
          where: `${addressColumn(roll)} IS NOT NULL`,
          outFields: outFieldsOf(roll).join(','),
          resultRecordCount: '8',
        }),
        query(roll, {
          where: `${addressColumn(roll)} LIKE '1%'`,
          outFields: outFieldsOf(roll).join(','),
          resultRecordCount: '8',
        }),
      ]);

      // One of each address: a layer of address points lists a building once
      // per unit, and six samples of one building are one sample.
      const known = [...head.slice(0, 4), ...ones.slice(0, 4)]
        .map((row) => (row.attributes ? readRow(roll, row.attributes) : null))
        .filter((row) => row !== null && /^\d/.test(row.address))
        .filter((row, index, rows) => rows.findIndex((other) => other!.address === row!.address) === index)
        .slice(0, 6);

      if (known.length === 0) return;

      let priced = 0;
      // A building of condominiums asked about without a unit is declined so
      // the reader can say which unit, which is the check working on a
      // building rather than a property, so it is not counted either way.
      let buildings = 0;

      for (const row of known) {
        const suggestions = await queryRoll(roll, parseTypedAddress(row!.address), row!.address);
        const suggestion = suggestions.find(
          (candidate) => candidate.assessedValue || candidate.justValue || candidate.valueLookup,
        );
        if (!suggestion) continue;

        if (suggestion.assessedValue || suggestion.justValue) {
          priced += 1;
          continue;
        }

        const result = await resolveParcelValue(
          suggestion.valueLookup!,
          suggestion.address,
          suggestion.countyName,
          suggestion.parcelId,
        );
        if (result.status === 'found') priced += 1;
        if (result.status === 'declined' && result.reason === 'which-unit') buildings += 1;
      }

      // Not all of them: a lookup that declines is the check working, and an
      // address point on a driveway, or a parcel the state roll has not caught
      // up with, will decline. Half is the bar. Below that a county is worse
      // than useless — it offers a property and then cannot price it — and
      // belongs out of the registry until it publishes something better.
      const properties = known.length - buildings;
      expect(
        priced,
        `only ${priced} of ${properties} sampled properties produced a figure`,
      ).toBeGreaterThanOrEqual(Math.ceil(properties / 2));
    });
  },
);
