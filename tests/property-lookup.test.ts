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

import { rollFor } from '@/lib/county-rolls';
import {
  chooseParcel,
  parcelIdsAgree,
  readRow,
  unitWhereFor,
  whereFor,
} from '@/lib/property-lookup';
import { addressKey, addressesAgree, parseTypedAddress } from '@/lib/address-format';

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

/**
 * What the statewide roll answered for the point Orange County's address
 * points give every unit of 2484 San Tecla Street, recorded 22 September 2026.
 * Five parcels at one point: four condominium units stacked on the building,
 * and a strip of common ground next to it.
 */
const SAN_TECLA = [
  { PARCEL_ID: '012328819005109', PHY_ADDR1: '2484 SAN TECLA ST UNIT 109', JV: 222600, AV_SD: 222600, DOR_UC: '004', JV_HMSTD: 0 },
  { PARCEL_ID: '012328557500010', PHY_ADDR1: '6422 AGASTIA CT', JV: 259, AV_SD: 259, DOR_UC: '009', JV_HMSTD: 0 },
  { PARCEL_ID: '012328819005309', PHY_ADDR1: '2484 SAN TECLA ST UNIT 309', JV: 231500, AV_SD: 231500, DOR_UC: '004', JV_HMSTD: 0 },
  { PARCEL_ID: '012328819005209', PHY_ADDR1: '2484 SAN TECLA ST UNIT 209', JV: 231500, AV_SD: 97021, DOR_UC: '004', JV_HMSTD: 231500 },
  { PARCEL_ID: '012328819005409', PHY_ADDR1: '2484 SAN TECLA ST UNIT 409', JV: 231500, AV_SD: 139510, DOR_UC: '004', JV_HMSTD: 231500 },
];

describe('choosing the parcel at a point', () => {
  const pick = (address: string, parcelId: string | null = null) =>
    chooseParcel(SAN_TECLA, { address, parcelId, geocodedAddress: null });

  it('takes the unit that was picked, not the first unit the layer lists', () => {
    const choice = pick('2484 San Tecla Street Unit 209');
    expect(choice.status).toBe('chosen');
    expect(choice.status === 'chosen' && choice.attributes.PARCEL_ID).toBe('012328819005209');
  });

  it('takes it by parcel number where the county gave one', () => {
    // Orange writes 28-23-01 where the state writes 01-23-28.
    const choice = pick('2484 San Tecla Street Unit 409', '282301819005409');
    expect(choice.status === 'chosen' && choice.attributes.PARCEL_ID).toBe('012328819005409');
  });

  it('declines a unit that is not among them, rather than lending it a neighbour’s value', () => {
    // Unit 105's outline is elsewhere on the building. Before, the first row —
    // unit 109 — was taken, and its value shown under unit 105's address.
    expect(pick('2484 San Tecla Street Unit 105', '282301819005105')).toEqual({
      status: 'declined',
      reason: 'mismatch',
    });
  });

  it('asks which unit when none was picked', () => {
    expect(pick('2484 San Tecla Street')).toEqual({ status: 'declined', reason: 'which-unit' });
  });

  it('asks which unit even when only one unit is under the point', () => {
    expect(
      chooseParcel([SAN_TECLA[0]], { address: '2484 San Tecla St', parcelId: null, geocodedAddress: null }),
    ).toEqual({ status: 'declined', reason: 'which-unit' });
  });

  it('takes a house, and a building filed as one parcel with a unit on its address', () => {
    const house = [{ PARCEL_ID: '0935960000R', PHY_ADDR1: '4304 HERSCHEL ST', DOR_UC: '001' }];
    expect(
      chooseParcel(house, { address: '4304 Herschel St', parcelId: null, geocodedAddress: null }).status,
    ).toBe('chosen');

    const duplex = [{ PARCEL_ID: '1234567', PHY_ADDR1: '427 W 10TH AVE APT A', DOR_UC: '008' }];
    expect(
      chooseParcel(duplex, { address: '427 W 10th Ave', parcelId: null, geocodedAddress: null }).status,
    ).toBe('chosen');
  });

  it('declines a point that landed on another address', () => {
    const next = [{ PARCEL_ID: '0935960001R', PHY_ADDR1: '4306 HERSCHEL ST', DOR_UC: '001' }];
    expect(
      chooseParcel(next, { address: '4304 Herschel St', parcelId: null, geocodedAddress: null }),
    ).toEqual({ status: 'declined', reason: 'mismatch' });
  });
});

const broward = rollFor('broward-county')!;
const miamiDade = rollFor('miami-dade-county')!;
const palmBeach = rollFor('palm-beach-county')!;

describe('asking a roll for a unit', () => {
  it('asks Miami-Dade for the unit however it is written into the address', () => {
    const parsed = parseTypedAddress('1850 S Bayshore Dr Unit 1');
    expect(whereFor(miamiDade, parsed)).toBe("UPPER(TRUE_SITE_ADDR) LIKE '1850 S BAYSHORE DR%'");
    expect(unitWhereFor(miamiDade, parsed)).toBe(
      "(UPPER(TRUE_SITE_ADDR) LIKE '% 1' OR UPPER(TRUE_SITE_ADDR) LIKE '%#1')",
    );
  });

  it('asks Broward’s unit column, which pads the unit with spaces', () => {
    const clause = unitWhereFor(broward, parseTypedAddress('4400 NW 6th St Apt 101'));
    expect(clause).toContain("UPPER(SITUS_UNIT_NUMBER) LIKE '101 %'");
  });

  it('asks nothing extra where no unit was typed', () => {
    expect(unitWhereFor(miamiDade, parseTypedAddress('1850 S Bayshore Dr'))).toBeNull();
  });

  it('asks for an O’Brien every way a roll might spell it', () => {
    expect(whereFor(broward, parseTypedAddress("100 O'Brien St"))).toContain(
      "(SITUS_STREET_NAME LIKE 'O_BRIEN%' OR SITUS_STREET_NAME LIKE 'OBRIEN%')",
    );
  });
});

describe('reading a row off a roll', () => {
  it('leaves out Palm Beach’s common ground, which is filed at an address and valued at nothing', () => {
    expect(
      readRow(palmBeach, {
        SITE_ADDR_STR: '100 LAKE DR',
        PROPERTY_USE: 'RESIDENTIAL COMMON AREA/ELEMENT',
        TOTAL_MARKET: 0,
      }),
    ).toBeNull();
  });

  it('reads the homestead flag and the recorded sale', () => {
    // A Palm Beach row as the layer returns it.
    const row = readRow(palmBeach, {
      SITE_ADDR_STR: '1411 SW 19TH ST',
      HMSTD_FLG: 'Y',
      SALE_DATE: 1738886400000,
      PRICE: 1300000,
      ASSESSED_VAL: 935131,
      TOTAL_MARKET: 935131,
    });
    expect(row).toMatchObject({ homestead: true, lastSale: { price: 1300000, year: 2025 } });
  });

  it('says nothing of a sale for nominal consideration', () => {
    const row = readRow(palmBeach, {
      SITE_ADDR_STR: '129 CLARENDON AVE',
      HMSTD_FLG: 'Y',
      SALE_DATE: 1697155200000,
      PRICE: 10,
    });
    expect(row?.lastSale).toBeNull();
  });

  it('reads Miami-Dade’s sale date, which is written as digits', () => {
    const row = readRow(miamiDade, {
      TRUE_SITE_ADDR: '121 NE 5 ST 1200',
      DOS_1: '20260122',
      PRICE_1: 346000,
      ASSESSED_VAL_CUR: 253000,
    });
    expect(row).toMatchObject({ homestead: null, lastSale: { price: 346000, year: 2026 } });
  });
});
