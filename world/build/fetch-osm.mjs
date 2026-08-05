// Fetch OSM terrain features inside the Ring via Overpass  (Beads 3rx.2).
// Data © OpenStreetMap contributors, ODbL (see docs/ATTRIBUTION.md).
// Run from repo root:  node world/build/fetch-osm.mjs

import { writeFileSync, mkdirSync } from "node:fs";
import { BBOX } from "../lib/projection.mjs";

const { minLat, minLon, maxLat, maxLon } = BBOX;
const bbox = `${minLat},${minLon},${maxLat},${maxLon}`;

const query = `[out:json][timeout:180];
(
  way["natural"="water"](${bbox});
  relation["natural"="water"](${bbox});
  way["waterway"~"^(river|canal)$"](${bbox});
  way["leisure"~"^(park|garden|recreation_ground|nature_reserve)$"](${bbox});
  relation["leisure"~"^(park|garden|recreation_ground|nature_reserve)$"](${bbox});
  way["landuse"~"^(forest|grass|meadow|village_green|recreation_ground|cemetery|allotments)$"](${bbox});
  relation["landuse"~"^(forest|grass|meadow|recreation_ground|cemetery)$"](${bbox});
  way["natural"~"^(wood|scrub|grassland)$"](${bbox});
);
out geom;`;

const res = await fetch("https://overpass-api.de/api/interpreter", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: "data=" + encodeURIComponent(query),
});
if (!res.ok) throw new Error("Overpass HTTP " + res.status);
const json = await res.json();

mkdirSync("world/osm", { recursive: true });
writeFileSync("world/osm/terrain.json", JSON.stringify(json));

const kinds = {};
for (const el of json.elements) kinds[el.type] = (kinds[el.type] || 0) + 1;
console.log("elements:", json.elements.length, JSON.stringify(kinds));
