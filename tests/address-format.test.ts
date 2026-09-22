/**
 * Reading a half-typed address well enough to ask a county roll about it.
 *
 * Two things here are worth a test rather than a careful reading. The first is
 * the ordinal: Broward files 48th Street under "48" and Palm Beach files it
 * under "48TH", so a prefix that commits to either misses half the state. The
 * second is that these strings are interpolated into a SQL LIKE clause on a
 * public service — the normaliser is the thing standing between a typed quote
 * and that clause, so what it drops is asserted rather than assumed.
 */
import { describe, expect, it } from 'vitest';

import {
  addressesAgree,
  formatAddressForDisplay,
  formatPlaceForDisplay,
  namesAnotherState,
  normalizeAddressText,
  parseTypedAddress,
  prefixVariants,
  rollAddressPrefix,
  scoreAddressMatch,
  stripOrdinal,
} from '@/lib/address-format';

describe('normalising what was typed', () => {
  it('upper cases, and keeps only what an address is made of', () => {
    expect(normalizeAddressText('1409 n.w. 48th st.')).toBe('1409 NW 48TH ST');
  });

  it('drops the characters that would otherwise reach a LIKE clause', () => {
    // A quote ends a string literal, and % and _ are wildcards. None of the
    // three survive to be escaped later.
    expect(normalizeAddressText("100 O'Brien St")).toBe('100 O BRIEN ST');
    expect(normalizeAddressText('100 % _ Main')).toBe('100 MAIN');
  });

  it('keeps the punctuation a unit number is written with', () => {
    expect(normalizeAddressText('1200 Brickell Ave #100-A')).toBe('1200 BRICKELL AVE #100-A');
  });

  it('reduces an ordinal to the digits under it', () => {
    expect(stripOrdinal('48TH')).toBe('48');
    expect(stripOrdinal('2ND')).toBe('2');
    expect(stripOrdinal('BRICKELL')).toBe('BRICKELL');
  });
});

describe('parsing an address into the parts a roll is queried by', () => {
  it('separates the house number, the directional and the street', () => {
    expect(parseTypedAddress('1409 NW 48th St, Boca Raton FL 33431')).toEqual({
      number: '1409',
      directional: 'NW',
      street: ['48', 'ST'],
      unit: null,
      locality: 'Boca Raton',
      zip: '33431',
    });
  });

  it('does not read a city as a street', () => {
    // Without the comma-split, "Boca" is a street name and the query finds
    // nothing at all.
    expect(parseTypedAddress('1409 48th St, Boca Raton').street).toEqual(['48', 'ST']);
  });

  it('reads an address with no county and no state on it', () => {
    expect(parseTypedAddress('4304 Herschel St')).toMatchObject({
      number: '4304',
      directional: null,
      street: ['HERSCHEL', 'ST'],
    });
  });

  it('does not mistake a one-word street for a directional', () => {
    // "N" alone is the street here, not the direction of anything.
    expect(parseTypedAddress('100 N').directional).toBeNull();
  });

  it('has no house number when none was typed', () => {
    expect(parseTypedAddress('Las Olas Blvd').number).toBeNull();
  });
});

describe('the prefix a roll is asked for', () => {
  it('stops at the number in a numbered street, because the counties disagree after it', () => {
    // Broward stores "48", Palm Beach stores "48TH". Both start "1409 NW 48".
    expect(rollAddressPrefix(parseTypedAddress('1409 NW 48th St'))).toBe('1409 NW 48');
  });

  it('keeps the whole of a named street', () => {
    expect(rollAddressPrefix(parseTypedAddress('4304 Herschel St'))).toBe('4304 HERSCHEL ST');
  });

  it('asks for nothing without a house number', () => {
    expect(rollAddressPrefix(parseTypedAddress('Herschel St'))).toBeNull();
  });
});

describe('ranking what the roll sent back', () => {
  it('reads an ordinal and its digits as the same address', () => {
    expect(scoreAddressMatch('1409 NW 48th St', '1409 NW 48 ST')).toBe(1);
  });

  it('puts the address itself above the units inside it', () => {
    const exact = scoreAddressMatch('100 Worth Ave', '100 WORTH AVE');
    const unit = scoreAddressMatch('100 Worth Ave', '100 WORTH AVE PH 14');

    expect(exact).toBeGreaterThan(unit);
    expect(unit).toBeGreaterThan(0);
  });

  it('prefers the shorter of two continuations', () => {
    expect(scoreAddressMatch('100 Worth', '100 WORTH AVE')).toBeGreaterThan(
      scoreAddressMatch('100 Worth', '100 WORTH AVE PENTHOUSE 14'),
    );
  });

  it('scores an unrelated street at nothing worth showing', () => {
    expect(scoreAddressMatch('1409 NW 48th St', '22 PALM BEACH LAKES BLVD')).toBe(0);
  });
});

describe('writing an address back out', () => {
  it('stops a roll shouting at the reader', () => {
    expect(formatAddressForDisplay('1409 NW 48TH ST')).toBe('1409 NW 48th St');
  });

  it('leaves a directional as a directional', () => {
    expect(formatAddressForDisplay('100 SE 3RD AVE')).toBe('100 SE 3rd Ave');
  });

  it('title cases a place, hyphens and all', () => {
    expect(formatPlaceForDisplay('LAUDERDALE-BY-THE-SEA')).toBe('Lauderdale-By-The-Sea');
    expect(formatPlaceForDisplay('WEST PALM BEACH')).toBe('West Palm Beach');
  });
});

describe('asking a source that spells the street type out', () => {
  it('leaves the type off the prefix, so St matches Street and Trl matches Trail', () => {
    // Orange County's address points read "1409 E Esther Street" and
    // "400 S Orange Blossom Trail". "TRL" is not a prefix of "TRAIL".
    expect(rollAddressPrefix(parseTypedAddress('1409 E Esther St'), { dropStreetType: true })).toBe(
      '1409 E ESTHER',
    );
    expect(
      rollAddressPrefix(parseTypedAddress('400 S Orange Blossom Trl'), { dropStreetType: true }),
    ).toBe('400 S ORANGE BLOSSOM');
  });

  it('keeps a street that is only a type word', () => {
    // "100 Park Way" is a street called Park Way, and dropping the type would
    // leave "100 PARK", which still finds it.
    expect(rollAddressPrefix(parseTypedAddress('100 Park Way'), { dropStreetType: true })).toBe(
      '100 PARK',
    );
  });
});

describe('checking a parcel found by location against the address picked', () => {
  it('accepts the same address written two ways', () => {
    expect(addressesAgree('4304 Herschel St', '4304 HERSCHEL ST')).toBe(true);
    expect(addressesAgree('400 S Orange Avenue', '400 S ORANGE AVE')).toBe(true);
    expect(addressesAgree('1409 NW 48th Street', '1409 NW 48 ST')).toBe(true);
  });

  it('refuses the house next door, which is the whole point of it', () => {
    expect(addressesAgree('4304 Herschel St', '4306 HERSCHEL ST')).toBe(false);
    expect(addressesAgree('400 S Orange Ave', '400 S ORANGE BLOSSOM TRL')).toBe(false);
    expect(addressesAgree('1409 NW 48th St', '1409 SW 48 ST')).toBe(false);
    expect(addressesAgree('400 Orange Ave', '400 ORCHID AVE')).toBe(false);
  });

  it('refuses a right-of-way parcel, which carries a street and no number', () => {
    expect(addressesAgree('2500 E Las Olas Blvd', 'LAS OLAS BLVD')).toBe(false);
  });
});

describe('a unit on the end of one of them', () => {
  it('is the same front door', () => {
    // A county's address point against the state's row for the parcel under it.
    expect(addressesAgree('427 W 10th Ave', '427 W 10TH AVE APT A')).toBe(true);
    expect(addressesAgree('1200 Brickell Ave', '1200 BRICKELL AVE 100-A')).toBe(true);
    expect(addressesAgree('100 Worth Ave PH 14', '100 WORTH AVE')).toBe(true);
  });

  it('matches a street that ends in a directional', () => {
    // One letter, and identical: "1832 Manatee Ave E" is filed on the state
    // roll as "1832 MANATEE AVE E".
    expect(addressesAgree('1832 Manatee Ave E', '1832 MANATEE AVE E')).toBe(true);
    expect(addressesAgree('1524 8th Ave W', '1524 8TH AVE W')).toBe(true);
    // But not to the other side of the street grid.
    expect(addressesAgree('1832 Manatee Ave E', '1832 MANATEE AVE W')).toBe(false);
  });

  it('does not stretch to another street', () => {
    expect(addressesAgree('400 S Orange Ave', '400 S ORANGE BLOSSOM TRL')).toBe(false);
    expect(addressesAgree('5151 N Sr Highway A1a', '5151 N HIGHWAY A1A 312')).toBe(false);
  });
});

describe('reading a unit off the address', () => {
  it('takes it after a marker, a hash, or a comma', () => {
    expect(parseTypedAddress('2484 San Tecla St Unit 105').unit).toBe('105');
    expect(parseTypedAddress('1200 Brickell Ave #100-A').unit).toBe('100A');
    // After a comma it is still the street line's, not the city's.
    expect(parseTypedAddress('123 Main St, Unit 5, Miami')).toMatchObject({
      street: ['MAIN', 'ST'],
      unit: '5',
      locality: 'Miami',
    });
  });

  it('takes a bare number after the street type, the way Miami-Dade writes one', () => {
    expect(parseTypedAddress('1850 S BAYSHORE DR 1')).toMatchObject({
      street: ['BAYSHORE', 'DR'],
      unit: '1',
    });
    expect(parseTypedAddress('121 NE 5 ST 1200').unit).toBe('1200');
  });

  it('leaves a numbered street and a numbered road alone', () => {
    expect(parseTypedAddress('1409 NW 48th St').unit).toBeNull();
    expect(parseTypedAddress('2500 US Highway 1').unit).toBeNull();
    expect(parseTypedAddress('5151 N Highway A1A').unit).toBeNull();
    // A road's number, then a unit after it.
    expect(parseTypedAddress('5151 N HIGHWAY A1A 312').unit).toBe('312');
  });

  it('keeps a penthouse apart from the unit with the same number', () => {
    expect(parseTypedAddress('100 Worth Ave PH 14').unit).toBe('PH14');
  });

  it('never puts the unit in the prefix a roll is asked for', () => {
    // Miami-Dade stores "1850 S BAYSHORE DR 1"; a prefix with UNIT in it
    // matches nothing there.
    expect(rollAddressPrefix(parseTypedAddress('1850 S Bayshore Dr Unit 1'))).toBe(
      '1850 S BAYSHORE DR',
    );
  });
});

describe('reading the rest of what people type', () => {
  it('reads a spelled-out directional as the one the rolls store', () => {
    expect(parseTypedAddress('1409 North Federal Hwy')).toMatchObject({
      directional: 'N',
      street: ['FEDERAL', 'HWY'],
    });
    // But West Street is a street called West.
    expect(parseTypedAddress('100 West St')).toMatchObject({
      directional: null,
      street: ['WEST', 'ST'],
    });
  });

  it('takes a hyphenated house number whole', () => {
    expect(parseTypedAddress('12-34 Main St').number).toBe('12-34');
  });
});

describe('the spellings a roll is asked under', () => {
  it('asks for an O’Brien with the apostrophe, the space, or neither', () => {
    // `_` is a one-character LIKE wildcard: O'BRIEN and O BRIEN both match it.
    expect(prefixVariants('100 O BRIEN')).toEqual(['100 O_BRIEN', '100 OBRIEN']);
  });

  it('asks for Saint and Mount both ways', () => {
    expect(prefixVariants('100 ST ANDREWS')).toEqual(['100 ST ANDREWS', '100 SAINT ANDREWS']);
    expect(prefixVariants('100 MOUNT VERNON')).toEqual(['100 MT VERNON', '100 MOUNT VERNON']);
  });

  it('leaves a street type at the end as it is', () => {
    expect(prefixVariants('4304 HERSCHEL ST')).toEqual(['4304 HERSCHEL ST']);
  });
});

describe('what the address check calls the same street', () => {
  // Each of these was once let through, because any short word was allowed
  // to stand for any longer word it began.
  it.each([
    ['100 Oak St', '100 OAKLAND ST'],
    ['100 Pa Ave', '100 PALM AVE'],
    ['100 Sea Dr', '100 SEABREEZE DR'],
    ['100 Park Ave', '100 PARKSIDE AVE'],
  ])('keeps %s and %s apart', (typed, roll) => {
    expect(addressesAgree(typed, roll)).toBe(false);
  });

  it.each([
    ['1409 North Federal Hwy', '1409 N FEDERAL HWY'],
    ['1409 Northwest 48th Street', '1409 NW 48 ST'],
    ['1832 Manatee Avenue East', '1832 MANATEE AVE E'],
    ['100 Saint Andrews Blvd', '100 ST ANDREWS BLVD'],
    ['100 Mount Vernon St', '100 MT VERNON ST'],
    ['100 O’Brien St', '100 OBRIEN ST'],
    ["100 O'Brien St", '100 O BRIEN ST'],
    ['100 OBrien St', "100 O'BRIEN ST"],
    ['12-34 Main St', '12-34 MAIN ST'],
    ['123 Main St, Unit 5, Miami', '123 MAIN ST UNIT 5'],
    ['1200 Brickell Ave #100-A', '1200 BRICKELL AVE 100-A'],
  ])('reads %s and %s as one address', (typed, roll) => {
    expect(addressesAgree(typed, roll)).toBe(true);
  });

  it('refuses another unit in the same building', () => {
    expect(addressesAgree('2484 San Tecla Street Unit 105', '2484 SAN TECLA ST UNIT 109')).toBe(
      false,
    );
    expect(addressesAgree('123 Main St, Apt 5', '123 MAIN ST UNIT 6')).toBe(false);
    expect(addressesAgree('1850 S Bayshore Dr Unit 1', '1850 S BAYSHORE DR 10')).toBe(false);
  });

  it('refuses the other half of a hyphenated number', () => {
    expect(addressesAgree('12-34 Main St', '12 MAIN ST')).toBe(false);
  });
});

describe('ranking a spelled-out address', () => {
  it('finds the roll’s abbreviation', () => {
    expect(scoreAddressMatch('1409 North Federal Highway', '1409 N FEDERAL HWY')).toBe(1);
  });

  it('still lets a half-typed street type start a spelled-out one', () => {
    expect(scoreAddressMatch('1409 E Esther Stre', '1409 E ESTHER STREET')).toBeGreaterThan(0.8);
  });
});

describe('writing a roll’s names back out', () => {
  it.each([
    ['100 MCDONALD ST', '100 McDonald St'],
    ['100 MACARTHUR BLVD', '100 MacArthur Blvd'],
    ['100 MACON ST', '100 Macon St'],
    ['100 O BRIEN ST', '100 O’Brien St'],
    ['5151 N HIGHWAY A1A', '5151 N Highway A1A'],
    ['2500 US HIGHWAY 1', '2500 US Highway 1'],
    ['100 SR 7', '100 SR 7'],
    ['100 WORTH AVE PH 14', '100 Worth Ave PH 14'],
  ])('writes %s as %s', (roll, shown) => {
    expect(formatAddressForDisplay(roll)).toBe(shown);
  });
});

describe('an address that says it is somewhere else', () => {
  it('is caught by another state’s code or a ZIP outside Florida’s', () => {
    expect(namesAnotherState('100 Peachtree St, Atlanta, GA 30303')).toBe(true);
    expect(namesAnotherState('100 Peachtree St, Atlanta, GA')).toBe(true);
    expect(namesAnotherState('100 Main St 30303')).toBe(true);
  });

  it('is not guessed at otherwise', () => {
    expect(namesAnotherState('1409 NW 48th St, Boca Raton, FL 33431')).toBe(false);
    expect(namesAnotherState('1409 NW 48th St, Boca Raton')).toBe(false);
    expect(namesAnotherState('4304 Herschel St')).toBe(false);
    expect(namesAnotherState('100 Main St, Jacksonville, FL, USA')).toBe(false);
  });
});
