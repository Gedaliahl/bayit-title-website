/**
 * What the address box is offered, decided against recorded answers rather
 * than the live services.
 *
 * Every request the search makes is answered here by URL, so each test is
 * about one decision the search takes with what comes back: whether an empty
 * list means "nothing there" or "nobody answered", whether two sources'
 * descriptions of one house become one suggestion, and when it is worth
 * asking every county in the state.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearLookupCache } from '@/lib/lookup-fetch';
import { searchProperties } from '@/lib/property-lookup';

type Route = [RegExp, unknown];

/** A fetch that answers each URL from the routes given, and an empty layer otherwise. */
function answering(routes: Route[]) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = decodeURIComponent(String(input));
    for (const [pattern, body] of routes) if (pattern.test(url)) return Response.json(body);
    return Response.json({ features: [] });
  });
}

beforeEach(() => {
  clearLookupCache();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('an address in another state', () => {
  it('is answered without asking anybody', async () => {
    const fetch = answering([]);
    vi.stubGlobal('fetch', fetch);

    const result = await searchProperties('100 Peachtree St, Atlanta, GA 30303');

    expect(result).toEqual({ suggestions: [], status: 'outside-florida' });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('an empty list', () => {
  it('is "nothing found" only when every service answered', async () => {
    vi.stubGlobal('fetch', answering([]));
    expect(await searchProperties('4304 Nowhere Ln')).toEqual({ suggestions: [], status: 'ok' });
  });

  it('is "could not ask" when the services did not answer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed');
      }),
    );
    expect((await searchProperties('4304 Nowhere Ln')).status).toBe('unavailable');
  });

  it('is "could not ask" when a service answered with an ArcGIS error', async () => {
    // HTTP 200 with the refusal in the body, which is how ArcGIS says no.
    vi.stubGlobal('fetch', answering([[/./, { error: { code: 400, message: 'Invalid query' } }]]));
    expect((await searchProperties('4304 Nowhere Ln')).status).toBe('unavailable');
  });
});

describe('Orange County’s address points', () => {
  it('print the unit once', async () => {
    vi.stubGlobal(
      'fetch',
      answering([
        [
          /OCAddressLocator/,
          {
            features: [
              {
                attributes: {
                  OFFICIAL_PARCEL_ID: '282301819005105',
                  COMPLETE_ADDRESS: '2484 San Tecla Street UNIT 105',
                  UNIT: 'UNIT 105',
                  MUNICIPAL_JURISDICTION: 'Orlando',
                  LATITUDE: 28.5144142,
                  LONGITUDE: -81.46813735,
                },
              },
            ],
          },
        ],
      ]),
    );

    const { suggestions } = await searchProperties('2484 San Tecla St Unit 105');

    expect(suggestions.map((suggestion) => suggestion.address)).toEqual([
      '2484 San Tecla Street Unit 105',
    ]);
  });
});

describe('one house from two sources', () => {
  it('is one suggestion when the geocoder does not know the county yet', async () => {
    vi.stubEnv('ARCGIS_API_KEY', 'test-key');
    vi.stubGlobal(
      'fetch',
      answering([
        [
          /Parcels_and_Property_Details/,
          {
            features: [
              {
                attributes: {
                  PARID: '06424736010470301',
                  SITE_ADDR_STR: '1411 SW 19TH ST',
                  MUNICIPALITY: 'BOCA RATON',
                  ASSESSED_VAL: 935131,
                  TOTAL_MARKET: 935131,
                },
              },
            ],
          },
        ],
        [
          /geocode\.arcgis\.com.*\/suggest/,
          { suggestions: [{ text: '1411 SW 19th St, Boca Raton, FL, 33486, USA', magicKey: 'k1' }] },
        ],
      ]),
    );

    const { suggestions } = await searchProperties('1411 SW 19th St');

    // The roll's row, with its figure — and not the geocoder's beside it.
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({ countySlug: 'palm-beach-county', justValue: 935131 });
  });
});

describe('asking every county', () => {
  it('happens when the only rows back are for another street at the same number', async () => {
    const fetch = answering([
      [
        /PARCEL_POLY_BCPA_TAXROLL/,
        {
          features: [
            {
              attributes: {
                FOLIO: '474135010091',
                SITUS_STREET_NUMBER: '1411',
                SITUS_STREET_NAME: 'OAKLAND',
                SITUS_STREET_TYPE: 'ST',
                NEW_SOH_VALUE: 300000,
              },
            },
          ],
        },
      ],
    ]);
    vi.stubGlobal('fetch', fetch);

    const result = await searchProperties('1411 Oak St, Nowhere');

    // Oakland is not Oak, so there is nothing to offer — and a county that
    // is only asked in the last wave has been asked.
    expect(result.suggestions).toEqual([]);
    const asked = fetch.mock.calls.map(([input]) => String(input));
    expect(asked.some((url) => url.includes('Lee_County_Parcels'))).toBe(true);
  });
});

describe('ranking', () => {
  it('puts the ZIP that was typed first', async () => {
    const census = (street: string, county: string) => ({
      matchedAddress: street,
      geographies: { Counties: [{ NAME: county, STATE: '12' }] },
    });
    vi.stubGlobal(
      'fetch',
      answering([
        [
          /geocoding\.geo\.census\.gov/,
          {
            result: {
              addressMatches: [
                census('100 MAIN ST, TOWN A, FL, 33401', 'Martin County'),
                census('100 MAIN ST, TOWN B, FL, 33480', 'St. Lucie County'),
              ],
            },
          },
        ],
      ]),
    );

    const { suggestions } = await searchProperties('100 Main St 33480');

    expect(suggestions.map((suggestion) => suggestion.zip)).toEqual(['33480', '33401']);
  });
});
