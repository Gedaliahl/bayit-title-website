/**
 * The check that stops a value-by-location lookup showing the wrong house.
 *
 * Orange and Duval publish where their addresses are, not what they are worth,
 * so the figure comes from the parcel the address stands on. Everything about
 * that is fine until the point lands a metre over a boundary, and then the page
 * shows the neighbour's assessed value with the address you typed above it and
 * nothing anywhere saying so. These are the two things that have to agree
 * before a figure is allowed through.
 */
import { describe, expect, it } from 'vitest';

import { parcelIdsAgree } from '@/lib/property-lookup';
import { addressKey, addressesAgree } from '@/lib/address-format';

describe('matching a parcel number across two offices', () => {
  it('reads Orange County’s ordering and the Department of Revenue’s as one parcel', () => {
    // Township-range-section against section-township-range, same parcel.
    expect(parcelIdsAgree('292301549601120', '012329549601120')).toBe(true);
    expect(parcelIdsAgree('292235135410001', '352229135410001')).toBe(true);
  });

  it('matches a number written the same way twice', () => {
    expect(parcelIdsAgree('0935960000R', '0935960000R')).toBe(true);
    // Punctuation is the office's habit, not part of the number.
    expect(parcelIdsAgree('29-23-01-5496-01-120', '012329549601120')).toBe(true);
  });

  it('refuses a different parcel', () => {
    expect(parcelIdsAgree('292301549601120', '292301549601121')).toBe(false);
    expect(parcelIdsAgree('0935960000R', '0935960001R')).toBe(false);
    expect(parcelIdsAgree(null, '012329549601120')).toBe(false);
    expect(parcelIdsAgree('012329549601120', null)).toBe(false);
    // Too short to carry a section, township and range, so the reordering
    // above cannot be what makes two of them match.
    expect(parcelIdsAgree('12345', '34125')).toBe(false);
  });
});

describe('the address half of the same check', () => {
  it('lets a parcel through when the roll spells the address differently', () => {
    expect(addressesAgree('4304 Herschel St', '4304 HERSCHEL ST')).toBe(true);
  });

  it('holds a parcel back when the roll has another address on it', () => {
    // The real case this exists for: Orange County's address point for
    // 1409 E Esther Street sits on a corner lot the state roll files as
    // 1919 Pine Bluff Ave. The parcel number is what confirms that one; the
    // address alone must not.
    expect(addressesAgree('1409 E Esther Street', '1919 PINE BLUFF AVE')).toBe(false);
  });
});

describe('the key two spellings of one address collapse to', () => {
  it('reads a type and its abbreviation as the same street', () => {
    expect(addressKey('1409 E Esther Street')).toBe(addressKey('1409 E Esther St'));
    expect(addressKey('400 S Orange Blossom Trail')).toBe(addressKey('400 S Orange Blossom Trl'));
  });

  it('keeps two streets that differ only by their type apart', () => {
    expect(addressKey('100 Park Ave')).not.toBe(addressKey('100 Park Way'));
  });
});
