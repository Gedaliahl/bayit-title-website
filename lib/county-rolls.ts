// Which service publishes which county's tax roll, and what its columns are
// called.
//
// This is a table rather than code because there are sixty-seven counties and
// no two property appraisers name a column the same way: the situs address is
// SITE_ADDR in Hillsborough, PHY_ADDR1 in Palm Beach, SITEADDR in Lee, and five
// separate columns in Broward. The machinery that turns an entry here into a
// query and a suggestion is in lib/property-lookup.ts; nothing in this file
// knows how to make a request.
//
// EVERY ENTRY WAS CHECKED AGAINST THE LIVE SERVICE. The check is scripted —
// `npm run check:rolls` — and it does three things per county: confirms the
// layer is inside the county it claims (a title search for "Citrus County
// parcels" cheerfully returns a Palm Beach layer), confirms an address search
// against it returns rows, and confirms the value columns hold money. Run it
// before trusting this file after a while: these are other offices' services
// and they move.
//
// A county with no entry is not broken. The address still names it, the page
// still links to its property appraiser, and the reader types the value in —
// which is what every county did before any of this existed.

export type AddressShape =
  /** The situs address in one column, as most rolls keep it. */
  | {
      kind: 'line';
      field: string;
      /** A unit or apartment number kept apart from the street line. */
      unitField?: string;
      /**
       * The roll writes "Street" where a reader types "St", so the prefix a
       * query is built from has to stop before the street type. See
       * rollAddressPrefix.
       */
      spellsTypeOut?: boolean;
    }
  /** Broward, and only Broward: five columns that have to be reassembled. */
  | {
      kind: 'parts';
      numberField: string;
      directionField?: string;
      nameField: string;
      typeField?: string;
      unitField?: string;
    };

/**
 * Where a county's figures come from once a property is picked.
 *
 * 'row'      — the layer carries them, so the suggestion arrives priced.
 * 'point'    — the layer is address points, so the search asks for the point
 *              itself; the figures are read off the Department of Revenue's
 *              statewide roll at it. An address point stands on the property,
 *              which is what the Census geocoder's interpolated point does not.
 * 'centroid' — a parcel layer whose service can hand back a centroid with the
 *              search. A parcel's centroid is inside the parcel.
 *
 * The last two are the reason a county can be added knowing only which column
 * holds the address. Their figures are the Department of Revenue's, cited as
 * such, and the state roll lags a county's own by up to a year — so 'row' wins
 * wherever the county publishes values worth trusting.
 */
export type FigureSource = 'row' | 'point' | 'centroid';

export interface CountyRoll {
  countySlug: string;
  countyName: string;
  figures: FigureSource;
  /**
   * Printed under the figure, because an unsourced number is a rumour. Needed
   * only where the county's own layer carries the figures; everywhere else the
   * figure is the Department of Revenue's and is named as theirs.
   */
  sourceName?: string;
  /** Where a reader checks the figure against the office that published it. */
  sourceUrl?: string;
  /** The layer's /query endpoint. */
  serviceUrl: string;
  address: AddressShape;
  /** The assessed value — capped by Save Our Homes where that applies. */
  assessedField?: string;
  /** Just (market) value, which is nearer what a policy is written for. */
  justField?: string;
  /** Rolls that publish just value in parts — land, building, everything else. */
  justParts?: string[];
  /** The roll year, where the county keeps one on the row. */
  yearField?: string;
  parcelField?: string;
  cityField?: string;
  /** Broward files its cities as two-letter codes; this turns them back. */
  cityCodes?: Record<string, string>;
  zipField?: string;
  /** The property's classification, in the appraiser's words. */
  useField?: string;
  /** Rows whose use makes them something other than a property — see Miami-Dade. */
  excludeUse?: string[];
  /**
   * This layer will hand back a parcel's centroid with a search, so a row whose
   * value columns are empty can still be priced from the statewide roll. Opt-in
   * per county: Miami-Dade's and Hillsborough's services reject the request
   * outright, which would take their searches down with it.
   */
  centroidOnSearch?: boolean;
  /**
   * Whether the roll counts the parcel as a homestead: a Y/N flag, or the
   * homestead exemption's amount, which is more than nothing on one.
   */
  homesteadField?: string;
  /** The most recent sale the roll records, as a date and a price. */
  saleDateField?: string;
  salePriceField?: string;
}

/**
 * Broward stores the situs city as a two-letter code and publishes no lookup
 * table with the layer. Every code below was derived from the roll itself: for
 * each code, the most common owner-mailing city among its homesteaded parcels,
 * which is the owner living at the property. `BC` (no street numbers, ZIPs in
 * the unincorporated north of the county) and `DN` (State Road 84 at 33312) do
 * not resolve that way and are read as unincorporated Broward and Dania Beach.
 *
 * It is a display label and nothing else — no figure and no county depends on
 * it, so a wrong entry costs a line of text under a suggestion.
 */
const BROWARD_CITY_CODES: Record<string, string> = {
  BC: 'Unincorporated Broward',
  CK: 'Coconut Creek',
  CS: 'Coral Springs',
  CY: 'Cooper City',
  DB: 'Deerfield Beach',
  DN: 'Dania Beach',
  DV: 'Davie',
  FL: 'Fort Lauderdale',
  HA: 'Hallandale Beach',
  HB: 'Hillsboro Beach',
  HW: 'Hollywood',
  LH: 'Lauderhill',
  LL: 'Lauderdale Lakes',
  LP: 'Lighthouse Point',
  LS: 'Lauderdale-by-the-Sea',
  LZ: 'Lazy Lake',
  MG: 'Margate',
  MM: 'Miramar',
  NL: 'North Lauderdale',
  OP: 'Oakland Park',
  PA: 'Parkland',
  PB: 'Pompano Beach',
  PI: 'Pembroke Pines',
  PK: 'Pembroke Park',
  PL: 'Plantation',
  SL: 'Sea Ranch Lakes',
  SU: 'Sunrise',
  SW: 'Southwest Ranches',
  TM: 'Tamarac',
  WM: 'Wilton Manors',
  WP: 'West Park',
  WS: 'Weston',
};

/** The date every entry below was last checked against its live service. */
export const ROLLS_CHECKED_ON = '2026-09-22';


/**
 * Eleven counties in one service.
 *
 * Leon County hosts the address points for Florida Division of Emergency
 * Management Region 2 — the Big Bend and the counties around it — as one layer
 * per county on the same map service. They share a schema, so they share a
 * shape here: the address, the community and the ZIP, and a point standing on
 * the property for the statewide roll to be read at.
 *
 * Franklin, Gadsden, Jefferson and Taylor are layers of the same service and
 * are deliberately absent, as St. Lucie's address points are: their points did
 * not land on a parcel the Department of Revenue could confirm often enough to
 * be worth offering. A county that suggests a property and then cannot price
 * it is worse than one that never suggested it, and `npm run check:rolls` is
 * what decides — half the sampled addresses have to produce a figure. If those
 * counties' data improves, or the state roll catches up with it, they go back
 * in by adding a line here.
 */
const REGION_2_SERVICE =
  'https://intervector.leoncountyfl.gov/intervector/rest/services/MapServices/FLEM_OverlayRegion2PointAddressLabels_D_WM/MapServer';

const REGION_2: CountyRoll[] = (
  [
    ['columbia-county', 'Columbia County', 0],
    ['dixie-county', 'Dixie County', 1],
    ['hamilton-county', 'Hamilton County', 4],
    ['lafayette-county', 'Lafayette County', 6],
    ['liberty-county', 'Liberty County', 8],
    ['madison-county', 'Madison County', 9],
    ['suwannee-county', 'Suwannee County', 10],
    ['wakulla-county', 'Wakulla County', 12],
  ] as [string, string, number][]
).map(([countySlug, countyName, layer]) => ({
  countySlug,
  countyName,
  figures: 'point' as const,
  serviceUrl: `${REGION_2_SERVICE}/${layer}/query`,
  // Some of these write "ZION HILL ROAD" where the next writes "SW KIRBY AVE",
  // so the search stops before the street type either way.
  address: { kind: 'line' as const, field: 'FULL_ADDRESS', spellsTypeOut: true },
  cityField: 'COMMUNITY',
  zipField: 'ZIP',
}));

export const COUNTY_ROLLS: CountyRoll[] = [
  {
    countySlug: 'broward-county',
    figures: 'row',
    centroidOnSearch: true,
    countyName: 'Broward County',
    sourceName: 'Broward County Property Appraiser tax roll',
    sourceUrl: 'https://web.bcpa.net/BcpaClient/#/Record-Search',
    serviceUrl:
      'https://services.arcgis.com/JMAJrTsHNLrSsWf5/arcgis/rest/services/PARCEL_POLY_BCPA_TAXROLL/FeatureServer/0/query',
    address: {
      kind: 'parts',
      numberField: 'SITUS_STREET_NUMBER',
      directionField: 'SITUS_STREET_DIRECTION',
      nameField: 'SITUS_STREET_NAME',
      typeField: 'SITUS_STREET_TYPE',
      unitField: 'SITUS_UNIT_NUMBER',
    },
    // NEW_SOH_VALUE is the assessed value after the Save Our Homes cap: on a
    // homesteaded parcel it is the taxable value plus the $50,000 exemption,
    // which is how it was identified. The roll carries just value in three
    // columns and none that adds them up.
    assessedField: 'NEW_SOH_VALUE',
    justParts: ['JUST_LAND_VALUE', 'JUST_BUILDING_VALUE', 'JUST_OTHER_VALUE'],
    parcelField: 'FOLIO',
    cityField: 'SITUS_CITY',
    cityCodes: BROWARD_CITY_CODES,
    zipField: 'SITUS_ZIP_CODE',
    homesteadField: 'HOMESTEAD_FLAG',
    // The roll's sale columns carry a stamp amount rather than a price, and
    // working a price back out of one is a guess, so no sale is read off it.
  },
  {
    countySlug: 'palm-beach-county',
    figures: 'row',
    centroidOnSearch: true,
    countyName: 'Palm Beach County',
    sourceName: 'Palm Beach County Property Appraiser roll',
    sourceUrl: 'https://pbcpao.gov/Property/Search',
    serviceUrl:
      'https://services1.arcgis.com/ZWOoUZbtaYePLlPw/arcgis/rest/services/Parcels_and_Property_Details_WebMercator/FeatureServer/0/query',
    address: { kind: 'line', field: 'SITE_ADDR_STR' },
    assessedField: 'ASSESSED_VAL',
    justField: 'TOTAL_MARKET',
    parcelField: 'PARID',
    // CITYNAME on this layer is the owner's mailing city — a Palm Beach
    // condominium owner in Connecticut has a Connecticut CITYNAME — so the
    // situs city is read off MUNICIPALITY instead.
    cityField: 'MUNICIPALITY',
    useField: 'PROPERTY_USE',
    // A subdivision's shared ground — the roads, the pond, the clubhouse lot —
    // is filed at a street address with a value of nothing, and is not a
    // property anybody buys a policy on.
    excludeUse: ['RESIDENTIAL COMMON AREA/ELEMENT'],
    homesteadField: 'HMSTD_FLG',
    saleDateField: 'SALE_DATE',
    salePriceField: 'PRICE',
  },
  {
    countySlug: 'miami-dade-county',
    figures: 'row',
    countyName: 'Miami-Dade County',
    sourceName: 'Miami-Dade County Property Appraiser roll',
    sourceUrl: 'https://www.miamidade.gov/Apps/PA/propertysearch/',
    serviceUrl:
      'https://services.arcgis.com/8Pc9XBTAsYuxx9Ny/arcgis/rest/services/PaGISView_gdb/FeatureServer/0/query',
    address: { kind: 'line', field: 'TRUE_SITE_ADDR' },
    // This view publishes the assessed value and no market value, so the
    // estimator has the capped figure here and says so.
    assessedField: 'ASSESSED_VAL_CUR',
    yearField: 'ASSESSMENT_YEAR_CUR',
    parcelField: 'FOLIO',
    cityField: 'TRUE_SITE_CITY',
    zipField: 'TRUE_SITE_ZIP_CODE',
    useField: 'DOR_DESC',
    // A reference folio is the roll's placeholder for a condominium's parent
    // parcel: an address, no value and nothing anybody buys.
    excludeUse: ['REFERENCE FOLIO'],
    saleDateField: 'DOS_1',
    salePriceField: 'PRICE_1',
  },
  {
    countySlug: 'hillsborough-county',
    figures: 'row',
    countyName: 'Hillsborough County',
    sourceName: 'Hillsborough County Property Appraiser roll',
    sourceUrl: 'https://gis.hcpafl.org/propertysearch/',
    serviceUrl:
      'https://services.arcgis.com/apTfC6SUmnNfnxuF/arcgis/rest/services/HCPA_Parcels_All/FeatureServer/0/query',
    address: { kind: 'line', field: 'SITE_ADDR' },
    assessedField: 'ASD_VAL',
    justField: 'JUST',
    parcelField: 'FOLIO',
    cityField: 'SITE_CITY',
    zipField: 'SITE_ZIP',
    saleDateField: 'S_DATE',
    salePriceField: 'S_AMT',
  },

  // ---------------------------------------------------------------------
  // Counties added by address, priced from the statewide roll.
  //
  // Each of these publishes where its addresses are — as address points, or as
  // parcels whose centroid the service will hand over — and the figures come
  // from the Department of Revenue at that point. They were found by searching
  // ArcGIS Online and the counties' own servers, and every one was checked the
  // way `npm run check:rolls` checks them: the layer sits inside the county it
  // claims, an address search of the shape this code builds returns rows, and
  // the parcel under the point carries the address that was searched for.
  // ---------------------------------------------------------------------
  {
    countySlug: 'bay-county',
    countyName: 'Bay County',
    figures: 'centroid',
    serviceUrl:
      'https://services9.arcgis.com/fd9yChPrElzusq8W/arcgis/rest/services/Bay_County_Parcels/FeatureServer/0/query',
    address: { kind: 'line', field: 'DSITEADDR', spellsTypeOut: true },
    zipField: 'DSITEZIP',
  },
  {
    countySlug: 'brevard-county',
    countyName: 'Brevard County',
    figures: 'point',
    serviceUrl:
      'https://gis.brevardfl.gov/gissrv/rest/services/Emergency_Management/9_1_1_Emergency_Response_Layers/MapServer/0/query',
    address: { kind: 'line', field: 'FULLADDRES', spellsTypeOut: true },
    cityField: 'SITE_CITY',
    zipField: 'SITE_ZIP',
  },
  {
    countySlug: 'flagler-county',
    countyName: 'Flagler County',
    figures: 'point',
    serviceUrl:
      'https://services3.arcgis.com/hSKL9bYjhP4rHxSD/arcgis/rest/services/Flagler_County_Address_Points_View_(reduced_fields)/FeatureServer/0/query',
    address: { kind: 'line', field: 'ADDRESS', spellsTypeOut: true },
    zipField: 'ZIPCODE',
  },
  {
    countySlug: 'hendry-county',
    countyName: 'Hendry County',
    figures: 'point',
    serviceUrl:
      'https://services7.arcgis.com/8l7Qq5t0CPLAJwJK/arcgis/rest/services/Hendry_County_Address_Points(GPS)/FeatureServer/0/query',
    address: { kind: 'line', field: 'FullAddres', spellsTypeOut: true },
  },
  {
    countySlug: 'indian-river-county',
    countyName: 'Indian River County',
    figures: 'point',
    serviceUrl:
      'https://gisportal.ircgov.com/server3/rest/services/Addressing/IRC_Address_Points_woLabels_MS/MapServer/0/query',
    address: { kind: 'line', field: 'ADDRESS', spellsTypeOut: true },
    zipField: 'ZIP5',
  },
  {
    countySlug: 'lee-county',
    countyName: 'Lee County',
    figures: 'row',
    sourceName: 'Lee County Property Appraiser roll',
    sourceUrl: 'https://www.leepa.org/Search/PropertySearch.aspx',
    serviceUrl:
      'https://services2.arcgis.com/LvWGAAhHwbCJ2GMP/arcgis/rest/services/Lee_County_Parcels/FeatureServer/0/query',
    address: { kind: 'line', field: 'SITEADDR' },
    assessedField: 'ASSESSED',
    justField: 'JUST',
    // Lee writes its parcel number as a STRAP, which shares no digits with the
    // Department of Revenue's number for the same parcel, so it is a label here
    // and never a key.
    parcelField: 'STRAP',
    cityField: 'SITECITY',
    zipField: 'SITEZIP',
    homesteadField: 'HSTDAMOUNT',
    saleDateField: 'S_1DATE',
    salePriceField: 'S_1AMOUNT',
  },
  {
    countySlug: 'leon-county',
    countyName: 'Leon County',
    figures: 'point',
    serviceUrl:
      'https://intervector.leoncountyfl.gov/intervector/rest/services/MapServices/TLC_OverlayAddressSearch_D_WM/MapServer/0/query',
    address: { kind: 'line', field: 'ADDRESS', spellsTypeOut: true },
    cityField: 'JURISDICTION',
    zipField: 'ZIPCD',
  },
  {
    countySlug: 'volusia-county',
    countyName: 'Volusia County',
    figures: 'point',
    serviceUrl: 'https://maps5.vcgov.org/arcgis/rest/services/Basemap/MapServer/0/query',
    address: { kind: 'line', field: 'ADDRESS', spellsTypeOut: true },
    zipField: 'ZIP',
  },
  ...REGION_2,
];

/** Every county this file can put a figure against, for the page's own copy. */
export const ROLL_COUNTY_SLUGS = COUNTY_ROLLS.map((roll) => roll.countySlug);

export function rollFor(countySlug: string): CountyRoll | null {
  return COUNTY_ROLLS.find((roll) => roll.countySlug === countySlug) ?? null;
}
