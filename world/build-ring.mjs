// Approximate boundary of the area enclosed by the Berlin Ringbahn (S41/S42).
// Vertices trace, roughly clockwise, the ring's characteristic corners near
// well-known Ringbahn stations. Coordinates are WGS84 [lon, lat].
// This is an APPROXIMATION (network to OSM Overpass was unavailable at build time).
//
// The ordering below walks clockwise starting from the north-west.
const ring = [
  // NW — Westhafen / Beusselstraße
  [13.3300, 52.5390],
  // N — Wedding / Gesundbrunnen (northernmost reach)
  [13.3620, 52.5570],
  [13.3900, 52.5590],
  // NE — Prenzlauer Berg / Schönhauser Allee / Landsberger Allee
  [13.4250, 52.5550],
  [13.4520, 52.5350],
  // E — Frankfurter Allee / Ostkreuz (easternmost reach)
  [13.4750, 52.5150],
  [13.4700, 52.4970],
  // SE — Treptower Park / Sonnenallee
  [13.4550, 52.4840],
  // S — Neukölln / Hermannstraße (southernmost reach)
  [13.4300, 52.4770],
  [13.3950, 52.4780],
  // S/SW — Tempelhof / Südkreuz
  [13.3650, 52.4810],
  [13.3450, 52.4900],
  // W/SW — Schöneberg / Innsbrucker Platz
  [13.3250, 52.5000],
  [13.2950, 52.5060],
  // W — Halensee / Westkreuz (westernmost reach)
  [13.2840, 52.5180],
  // NW — Charlottenburg / Messe
  [13.2900, 52.5300],
  [13.3050, 52.5360],
  // close ring
  [13.3300, 52.5390],
];

// Compute bounding box.
let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
for (const [lon, lat] of ring) {
  if (lon < minLon) minLon = lon;
  if (lat < minLat) minLat = lat;
  if (lon > maxLon) maxLon = lon;
  if (lat > maxLat) maxLat = lat;
}

// Approximate enclosed area (km^2) via a local equirectangular projection
// centered on the polygon, then the shoelace formula.
const R = 6371.0088; // mean Earth radius, km
const latRef = ((minLat + maxLat) / 2) * Math.PI / 180;
const toXY = ([lon, lat]) => {
  const x = R * (lon * Math.PI / 180) * Math.cos(latRef);
  const y = R * (lat * Math.PI / 180);
  return [x, y];
};
let area2 = 0;
for (let i = 0; i < ring.length - 1; i++) {
  const [x1, y1] = toXY(ring[i]);
  const [x2, y2] = toXY(ring[i + 1]);
  area2 += x1 * y2 - x2 * y1;
}
const areaKm2 = Math.abs(area2) / 2;

const geojson = {
  type: "Feature",
  properties: {
    name: "Berlin Ringbahn enclosed area (approximate)",
    description:
      "Approximate boundary of the area inside the Berlin Ringbahn (S41/S42 circle line).",
    source: "Approximation from known geography; refine with OSM Overpass data.",
    attribution: "© OpenStreetMap contributors",
    license: "ODbL",
    approximate: true,
  },
  geometry: {
    type: "Polygon",
    coordinates: [ring],
  },
};

process.stdout.write(
  JSON.stringify({
    bbox: { minLon, minLat, maxLon, maxLat },
    areaKm2: Math.round(areaKm2 * 10) / 10,
    geojson,
  }) + "\n"
);
