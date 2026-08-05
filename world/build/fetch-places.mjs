// Fetch district labels + venues inside the Ring via Overpass  (Beads 3rx.5/3rx.6).
// Uses curl (node's fetch hit a dead Overpass mirror here). `out center tags`
// gives a single point per element — all we need to place venues on tiles.
// Data © OpenStreetMap contributors, ODbL. Run from repo root.

import { writeFileSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { BBOX } from "../lib/projection.mjs";

const { minLat, minLon, maxLat, maxLon } = BBOX;
const bbox = `${minLat},${minLon},${maxLat},${maxLon}`;

const query = `[out:json][timeout:120];
(
  node["place"~"^(suburb|quarter)$"](${bbox});
  nwr["amenity"~"^(bar|pub|biergarten|restaurant|cafe|fast_food|nightclub)$"](${bbox});
  nwr["shop"~"^(supermarket|convenience|kiosk|clothes|boutique|sports|outdoor|hunting|weapons|greengrocer|butcher|bakery|department_store|general)$"](${bbox});
);
out center tags;`;

writeFileSync("world/osm/_places_query.txt", query);

const endpoints = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
let ok = false;
for (const ep of endpoints) {
  try {
    execSync(
      `curl -s --max-time 150 -G '${ep}' ` +
        "--data-urlencode data@world/osm/_places_query.txt -o world/osm/places.json",
      { stdio: "inherit" },
    );
    const txt = readFileSync("world/osm/places.json", "utf8");
    if (txt.trimStart().startsWith("{")) {
      ok = true;
      console.log("fetched via", ep);
      break;
    }
    console.log("busy/invalid from", ep, "-", txt.replace(/\s+/g, " ").slice(0, 100));
  } catch (e) {
    console.log("curl failed for", ep, "-", e.message);
  }
}
if (!ok) throw new Error("all Overpass endpoints failed (try again shortly)");

const j = JSON.parse(readFileSync("world/osm/places.json", "utf8"));
const kinds = {};
for (const el of j.elements) {
  const k = el.tags?.place ? "place" : el.tags?.amenity ? "amenity" : "shop";
  kinds[k] = (kinds[k] || 0) + 1;
}
console.log("elements:", j.elements.length, JSON.stringify(kinds));
