// Fetch U-/S-Bahn stations inside the Ring via Overpass  (Bead ady.1).
// OpenStreetMap station data (ODbL, © OpenStreetMap contributors). We use OSM
// for station geometry rather than the VBB GTFS feed — same license family, and
// it drops straight into the existing pipeline. Run from repo root.

import { writeFileSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { BBOX } from "../lib/projection.mjs";

const { minLat, minLon, maxLat, maxLon } = BBOX;
const bbox = `${minLat},${minLon},${maxLat},${maxLon}`;

const query = `[out:json][timeout:120];
(
  node["railway"="station"]["station"="subway"](${bbox});
  node["railway"="station"]["station"="light_rail"](${bbox});
  node["railway"="station"]["train"="yes"](${bbox});
  node["railway"="station"](${bbox});
  node["public_transport"="station"]["subway"="yes"](${bbox});
  node["public_transport"="station"]["light_rail"="yes"](${bbox});
);
out center tags;`;

writeFileSync("world/osm/_transit_query.txt", query);

const endpoints = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
let ok = false;
for (const ep of endpoints) {
  try {
    execSync(
      `curl -s --max-time 120 -G '${ep}' ` +
        "--data-urlencode data@world/osm/_transit_query.txt -o world/osm/transit.json",
      { stdio: "inherit" },
    );
    if (readFileSync("world/osm/transit.json", "utf8").trimStart().startsWith("{")) {
      ok = true;
      console.log("fetched via", ep);
      break;
    }
  } catch (e) {
    console.log("curl failed for", ep, "-", e.message);
  }
}
if (!ok) throw new Error("all Overpass endpoints failed (try again shortly)");

const j = JSON.parse(readFileSync("world/osm/transit.json", "utf8"));
console.log("station elements:", j.elements.length);
