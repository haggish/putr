// World projection for Penultimate I — The Ring  (Beads 3rx.3).
//
// Maps WGS84 lon/lat to integer tile coordinates on the overworld grid, using a
// local equirectangular projection centered on the Ring's latitude so tiles are
// ~square in real meters. The grid size is derived from the Ring bounding box at
// METERS_PER_TILE, so it stays geographically faithful (not forced to 256x256).
//
// Used by the build scripts (node); the runtime engine only consumes the JSON
// they emit, so this file never ships to the browser.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const geo = JSON.parse(
  readFileSync(join(here, "..", "ring-boundary.geojson"), "utf8"),
);
const RING = geo.geometry?.coordinates?.[0] ?? geo.coordinates?.[0];

let minLon = Infinity,
  minLat = Infinity,
  maxLon = -Infinity,
  maxLat = -Infinity;
for (const [lon, lat] of RING) {
  if (lon < minLon) minLon = lon;
  if (lon > maxLon) maxLon = lon;
  if (lat < minLat) minLat = lat;
  if (lat > maxLat) maxLat = lat;
}

export const METERS_PER_TILE = 40;
const M_PER_DEG_LAT = 111320;
const LAT_REF = (minLat + maxLat) / 2;
const M_PER_DEG_LON = 111320 * Math.cos((LAT_REF * Math.PI) / 180);

export const BBOX = { minLon, minLat, maxLon, maxLat };
export const WIDTH = Math.ceil(
  ((maxLon - minLon) * M_PER_DEG_LON) / METERS_PER_TILE,
);
export const HEIGHT = Math.ceil(
  ((maxLat - minLat) * M_PER_DEG_LAT) / METERS_PER_TILE,
);

/** lon/lat -> integer tile {x, y} (north is y=0, top-left origin). */
export function project(lon, lat) {
  const eastM = (lon - minLon) * M_PER_DEG_LON;
  const southM = (maxLat - lat) * M_PER_DEG_LAT;
  return {
    x: Math.floor(eastM / METERS_PER_TILE),
    y: Math.floor(southM / METERS_PER_TILE),
  };
}

/** tile {x,y} -> lon/lat of the tile center (inverse of project, approx). */
export function unproject(x, y) {
  const eastM = (x + 0.5) * METERS_PER_TILE;
  const southM = (y + 0.5) * METERS_PER_TILE;
  return {
    lon: minLon + eastM / M_PER_DEG_LON,
    lat: maxLat - southM / M_PER_DEG_LAT,
  };
}

/** Ray-casting point-in-polygon. `ring` is [[lon,lat], ...]. */
export function pointInPolygon(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Is a lon/lat inside the Ring boundary polygon? */
export function insideRing(lon, lat) {
  return pointInPolygon(lon, lat, RING);
}

export { RING };
