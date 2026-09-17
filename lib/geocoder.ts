// The statewide address geocoder: the last of the 67 counties, bought rather
// than found.
//
// Sixty-odd Florida counties publish nothing this site can search by address,
// and the two free statewide sources cannot stand in. The Department of
// Revenue's parcel roll answers "which parcel is at this point" and nothing
// else. The Census geocoder interpolates along a block and can be two hundred
// metres out — far enough to land on the wrong house, which is worse than
// landing nowhere.
//
// Esri's World Geocoding Service answers with a rooftop point and, more
// usefully, says which kind of answer it is giving: `Addr_type` is PointAddress
// or Subaddress when it has the building itself, and StreetAddress or
// StreetName when it is interpolating the way the Census does. Only the first
// kind is allowed to produce a figure here, so the difference between a
// geocoder that knows an address and one that is guessing at it is a field
// rather than a judgement call.
//
// It needs a key, and without one this file does nothing at all: no key means
// no statewide suggestions and the counties in lib/county-rolls.ts carry on as
// they are. See .env.example for where a key comes from and what it costs.
//
// Two notes on the arrangement with Esri, both of which are in the code below:
// suggestions are free and the geocode that follows one is billed, so the
// typing goes to /suggest and only a picked address is geocoded; and a geocode
// taken without `forStorage` may not be kept, so that response is never cached
// and nothing from it is written down.
import 'server-only';

import { isInFlorida } from './florida-albers';

const WORLD_GEOCODER = 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer';

/** Florida, generously boxed, so a half-typed street does not match Ohio. */
const FLORIDA_EXTENT = '-87.7,24.3,-79.8,31.1';

/** The address types Esri gives when it has the building rather than the block. */
const ROOFTOP_TYPES = new Set(['PointAddress', 'Subaddress', 'BuildingName']);

export interface GeocoderSuggestion {
  /** "1832 Manatee Ave E, Bradenton, FL, 34208, USA" */
  text: string;
  /** Esri's handle for this suggestion, spent when somebody picks it. */
  magicKey: string;
}

export interface GeocodedAddress {
  address: string;
  city: string | null;
  zip: string | null;
  /** "Manatee County", as Esri names it. */
  countyName: string | null;
  lat: number;
  lon: number;
  /** PointAddress, StreetAddress and so on — the reason this file exists. */
  addressType: string;
  /** Whether that type is the building rather than an interpolation. */
  rooftop: boolean;
}

/** Whether a key is configured. The page says something different without one. */
export function geocoderConfigured(): boolean {
  return Boolean(process.env.ARCGIS_API_KEY?.trim());
}

function token(): string | null {
  return process.env.ARCGIS_API_KEY?.trim() || null;
}

/** Typing is cheap; a dropdown that arrives late is not a dropdown. */
const SUGGEST_TIMEOUT_MS = 3_500;
const GEOCODE_TIMEOUT_MS = 6_000;

/**
 * What Esri would offer for a half-typed address, inside Florida.
 *
 * Suggestions are not billed and carry no coordinates, so they are safe to ask
 * for on a keystroke and safe to cache: the answer for "1832 Manatee" is the
 * same for everyone who types it.
 */
export async function suggestAddresses(typed: string): Promise<GeocoderSuggestion[]> {
  const found = await suggest(typed);
  if (found.length > 0) return found;

  // The city is the part that goes wrong. "1205 Alameda Ave, St. Petersburg"
  // matches nothing and "1205 Alameda Ave" matches the house, because the
  // geocoder wants Saint spelled out and a reader does not. The street line
  // alone is still inside the Florida extent, so nothing is lost by dropping
  // the rest of it and asking again.
  const street = typed.split(',')[0]?.trim();
  return street && street !== typed ? suggest(street) : [];
}

async function suggest(typed: string): Promise<GeocoderSuggestion[]> {
  const key = token();
  if (!key) return [];

  const url = `${WORLD_GEOCODER}/suggest?${new URLSearchParams({
    text: typed,
    searchExtent: FLORIDA_EXTENT,
    countryCode: 'USA',
    category: 'Address',
    maxSuggestions: '6',
    f: 'json',
    token: key,
  })}`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(SUGGEST_TIMEOUT_MS),
      next: { revalidate: 3_600 },
      headers: { accept: 'application/json' },
    });
    if (!response.ok) return [];

    const payload = (await response.json()) as {
      suggestions?: { text?: string; magicKey?: string; isCollection?: boolean }[];
      error?: unknown;
    };
    if (payload.error) {
      console.warn('[geocoder] suggest refused; check ARCGIS_API_KEY');
      return [];
    }

    return (payload.suggestions ?? [])
      // A collection is a street or a place, not an address, and there is no
      // parcel under one.
      .filter((row) => row.text && row.magicKey && !row.isCollection)
      .map((row) => ({ text: row.text as string, magicKey: row.magicKey as string }));
  } catch {
    // A geocoder that is slow or down costs the reader the statewide half of
    // the dropdown; the counties with their own rolls are unaffected.
    return [];
  }
}

/**
 * The coordinate behind a suggestion somebody picked. This is the billed call,
 * which is why it happens once per property rather than once per keystroke.
 */
export async function geocodeSuggestion(magicKey: string): Promise<GeocodedAddress | null> {
  const key = token();
  if (!key) return null;

  const url = `${WORLD_GEOCODER}/findAddressCandidates?${new URLSearchParams({
    magicKey,
    outFields: 'Addr_type,Match_addr,StAddr,City,Subregion,Region,Postal',
    outSR: '4326',
    maxLocations: '1',
    // Not stored, and the response is never cached, which is the condition the
    // cheaper geocode is offered on.
    forStorage: 'false',
    f: 'json',
    token: key,
  })}`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(GEOCODE_TIMEOUT_MS),
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      candidates?: {
        address?: string;
        location?: { x?: number; y?: number };
        attributes?: Record<string, string>;
      }[];
    };

    const candidate = payload.candidates?.[0];
    const lon = candidate?.location?.x;
    const lat = candidate?.location?.y;
    if (typeof lon !== 'number' || typeof lat !== 'number' || !isInFlorida(lon, lat)) return null;

    const attributes = candidate?.attributes ?? {};
    const addressType = attributes.Addr_type ?? '';

    return {
      address: attributes.StAddr || candidate?.address || '',
      city: attributes.City || null,
      zip: attributes.Postal || null,
      countyName: attributes.Subregion || null,
      lat,
      lon,
      addressType,
      rooftop: ROOFTOP_TYPES.has(addressType),
    };
  } catch {
    return null;
  }
}
