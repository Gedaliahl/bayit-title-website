/**
 * The statewide geocoder, when one is configured.
 *
 * Skipped without ARCGIS_API_KEY, because without a key there is no statewide
 * half to check: the counties in lib/county-rolls.ts carry the page on their
 * own and tests/rolls.live.test.ts is what checks them.
 *
 * What this proves is the part that cost money to buy: that a typed address
 * anywhere in Florida produces a rooftop point, that the point produces a
 * parcel off the Department of Revenue's roll, and that an interpolated match
 * — the geocoder guessing at where along a block a number falls — is refused
 * rather than priced.
 */
import { describe, expect, it } from 'vitest';

import { geocodeSuggestion, geocoderConfigured, suggestAddresses } from '@/lib/geocoder';
import { resolveParcelValue } from '@/lib/property-lookup';

/** Real addresses in counties that publish nothing this code can search. */
const ADDRESSES = [
  { typed: '2825 Chancery Ln, Clearwater, FL', county: 'Pinellas County' },
  { typed: '2117 11th St W, Bradenton, FL', county: 'Manatee County' },
  { typed: '233 Key Largo Pl, Pensacola, FL', county: 'Escambia County' },
];

describe.skipIf(!geocoderConfigured())('with a key configured', () => {
  it('finds a rooftop point for an address in a county with no roll of its own', async () => {
    const suggestions = await suggestAddresses(ADDRESSES[0].typed);
    expect(suggestions.length, 'the geocoder suggested nothing').toBeGreaterThan(0);

    const geocoded = await geocodeSuggestion(suggestions[0].magicKey);
    expect(geocoded, 'the suggestion did not geocode').not.toBeNull();
    expect(geocoded!.rooftop, `Addr_type was ${geocoded!.addressType}`).toBe(true);
    expect(geocoded!.countyName).toBe(ADDRESSES[0].county);
  });

  it('prices most of them off the statewide roll, and names the county', async () => {
    let priced = 0;

    for (const { typed, county } of ADDRESSES) {
      const suggestions = await suggestAddresses(typed);
      if (suggestions.length === 0) continue;

      const value = await resolveParcelValue(
        { kind: 'esri', magicKey: suggestions[0].magicKey },
        suggestions[0].text.split(',')[0],
        '',
        null,
      );

      if (value?.assessedValue || value?.justValue) {
        priced += 1;
        expect(value!.countyName).toBe(county);
        expect(value!.sourceName).toContain('Florida Department of Revenue');
      }
    }

    expect(priced, `only ${priced} of ${ADDRESSES.length} priced`).toBeGreaterThanOrEqual(2);
  });

  it('refuses a geocode that is an interpolation rather than a building', async () => {
    // A house number that does not exist on a street that does: the geocoder
    // answers with StreetAddress, which is the Census geocoder's kind of answer
    // and is not allowed to produce a figure here.
    const suggestions = await suggestAddresses('99999 Chancery Ln, Clearwater, FL');
    if (suggestions.length === 0) return;

    const geocoded = await geocodeSuggestion(suggestions[0].magicKey);
    if (!geocoded || geocoded.rooftop) return;

    const value = await resolveParcelValue(
      { kind: 'esri', magicKey: suggestions[0].magicKey },
      suggestions[0].text.split(',')[0],
      '',
      null,
    );
    expect(value).toBeNull();
  });
}, 300_000);
