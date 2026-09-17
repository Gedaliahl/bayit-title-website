// Latitude and longitude into the coordinate system the statewide parcel layer
// is stored in, EPSG:3086 — NAD83 / Florida GDL Albers, in metres.
//
// This exists for one reason: speed against one service. The Department of
// Revenue's statewide parcel layer will take a point in plain latitude and
// longitude and reproject it, and on a cold cache that took 44 seconds in
// testing against 0.4 for the same point handed over in the layer's own
// coordinates. A reader who has just picked their house is not waiting 44
// seconds, so the projection happens here instead.
//
// The formulas are the standard Albers equal-area conic ones (Snyder, Map
// Projections — A Working Manual, USGS Professional Paper 1395, §14) with the
// parameters EPSG publishes for 3086. Nothing about them is Florida-specific
// except the numbers.

/** GRS80, the ellipsoid NAD83 is on. */
const SEMI_MAJOR_AXIS = 6_378_137.0;
const FLATTENING = 1 / 298.257222101;
const E2 = 2 * FLATTENING - FLATTENING * FLATTENING;
const E = Math.sqrt(E2);

/** EPSG:3086: standard parallels 24° and 31.5°, origin 24°N 84°W, false easting 400km. */
const LAT_1 = (24 * Math.PI) / 180;
const LAT_2 = (31.5 * Math.PI) / 180;
const LAT_0 = (24 * Math.PI) / 180;
const LON_0 = (-84 * Math.PI) / 180;
const FALSE_EASTING = 400_000;
const FALSE_NORTHING = 0;

/** Snyder (3-12): the authalic-area term q. */
function authalicArea(latitude: number): number {
  const sin = Math.sin(latitude);
  return (
    (1 - E2) *
    (sin / (1 - E2 * sin * sin) - (1 / (2 * E)) * Math.log((1 - E * sin) / (1 + E * sin)))
  );
}

/** Snyder (14-15): the radius term m. */
function radiusTerm(latitude: number): number {
  const sin = Math.sin(latitude);
  return Math.cos(latitude) / Math.sqrt(1 - E2 * sin * sin);
}

const M_1 = radiusTerm(LAT_1);
const M_2 = radiusTerm(LAT_2);
const Q_1 = authalicArea(LAT_1);
const Q_2 = authalicArea(LAT_2);
const Q_0 = authalicArea(LAT_0);

const N = (M_1 * M_1 - M_2 * M_2) / (Q_2 - Q_1);
const C = M_1 * M_1 + N * Q_1;
const RHO_0 = (SEMI_MAJOR_AXIS * Math.sqrt(C - N * Q_0)) / N;

export interface AlbersPoint {
  x: number;
  y: number;
}

/**
 * WGS84 degrees to EPSG:3086 metres.
 *
 * NAD83 and WGS84 are treated as the same datum here. They differ by around a
 * metre in Florida, and the thing being asked is which parcel polygon a point
 * falls inside — a metre decides that only for a point already standing on a
 * boundary line, where no answer is the right one anyway.
 */
export function toFloridaAlbers(longitude: number, latitude: number): AlbersPoint {
  const phi = (latitude * Math.PI) / 180;
  const lambda = (longitude * Math.PI) / 180;

  const rho = (SEMI_MAJOR_AXIS * Math.sqrt(C - N * authalicArea(phi))) / N;
  const theta = N * (lambda - LON_0);

  return {
    x: FALSE_EASTING + rho * Math.sin(theta),
    y: FALSE_NORTHING + RHO_0 - rho * Math.cos(theta),
  };
}

/**
 * Florida's bounding box, generously drawn. A geocoder that has misunderstood
 * the question answers with a point in another state or with a pair of small
 * numbers near the Gulf of Guinea, and either would project to a coordinate the
 * parcel layer would happily search and find nothing at.
 */
export function isInFlorida(longitude: number, latitude: number): boolean {
  return longitude >= -88 && longitude <= -79.5 && latitude >= 24 && latitude <= 31.2;
}
