/**
 * The projection behind the statewide value lookup.
 *
 * Worth testing because a wrong answer here is silent: a point projected a
 * hundred metres off still lands on a parcel, that parcel still has an assessed
 * value, and the value is the neighbour's. The checks below are the ones that
 * fail loudly if a constant is mistyped — the projection's own origin, the
 * shape of the grid, and a point checked against the Department of Revenue's
 * service itself.
 */
import { describe, expect, it } from 'vitest';

import { isInFlorida, toFloridaAlbers } from '@/lib/florida-albers';

describe('projecting into EPSG:3086', () => {
  it('puts the projection origin at its false easting, exactly', () => {
    const origin = toFloridaAlbers(-84, 24);

    expect(origin.x).toBeCloseTo(400_000, 6);
    expect(origin.y).toBeCloseTo(0, 6);
  });

  it('agrees with the parcel service on a real address', () => {
    // 4304 Herschel St, Jacksonville. The Department of Revenue's parcel layer
    // was asked for this point twice — once in degrees, which it reprojects
    // itself, and once in these coordinates — and returned the same parcel,
    // 0935960000R, both times.
    const point = toFloridaAlbers(-81.713727, 30.282966);

    expect(point.x).toBeCloseTo(619_691.9, 0);
    expect(point.y).toBeCloseTo(699_326.4, 0);
  });

  it('runs east and north the way a projected grid should', () => {
    const west = toFloridaAlbers(-82, 28);
    const east = toFloridaAlbers(-81, 28);
    const north = toFloridaAlbers(-82, 29);

    expect(east.x).toBeGreaterThan(west.x);
    expect(north.y).toBeGreaterThan(west.y);
    // A degree of longitude at 28°N is about 98km; the projection must not be
    // out by an order of magnitude.
    expect(east.x - west.x).toBeGreaterThan(90_000);
    expect(east.x - west.x).toBeLessThan(105_000);
  });

  it('knows Florida from everywhere else', () => {
    expect(isInFlorida(-81.71, 30.28)).toBe(true);
    expect(isInFlorida(-80.11, 26.12)).toBe(true);
    // A geocoder's null island, and Georgia.
    expect(isInFlorida(3.87, 19.07)).toBe(false);
    expect(isInFlorida(-84.39, 33.75)).toBe(false);
  });
});
