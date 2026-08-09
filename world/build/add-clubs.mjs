// Curated overlay: add notable nightclubs that the OSM extract missed or tagged
// as something else (e.g. Club der Visionäre is tagged amenity=bar in OSM).
// Placed at real coordinates as NIGHTCLUB venues. Idempotent — re-run anytime.
//
//   node world/build/add-clubs.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { project } from "../lib/projection.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const ASSET = join(here, "..", "..", "public", "world", "berlin-overworld.json");

// [name, lon, lat]
const CLUBS = [
  ["Club der Visionäre", 13.4504805, 52.4967958],
];

const CODE = {
  ".": "street", p: "park", w: "water", r: "rail",
  v: "venue", b: "building", z: "plaza", s: "station",
};
const slug = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const asset = JSON.parse(readFileSync(ASSET, "utf8"));
const { width: W, height: H, tiles } = asset;
const kindAt = (x, y) => CODE[tiles[y * W + x]] ?? "street";
const BLOCKED = new Set(["water", "rail"]);

asset.venues = asset.venues.filter((v) => !String(v.id).startsWith("club/"));
const taken = new Set(asset.venues.map((v) => `${v.x},${v.y}`));

function place(x, y) {
  for (let r = 0; r <= 4; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (BLOCKED.has(kindAt(nx, ny))) continue;
        if (taken.has(`${nx},${ny}`)) continue;
        return { x: nx, y: ny };
      }
    }
  }
  return null;
}

let added = 0;
for (const [name, lon, lat] of CLUBS) {
  const t0 = project(lon, lat);
  const spot = place(t0.x, t0.y);
  if (!spot) continue;
  taken.add(`${spot.x},${spot.y}`);
  asset.venues.push({ id: `club/${slug(name)}`, name, category: "NIGHTCLUB", x: spot.x, y: spot.y });
  added++;
  console.log(`${name} -> tile (${spot.x},${spot.y})`);
}

writeFileSync(ASSET, JSON.stringify(asset));
console.log(`Added ${added} club(s). Nightclubs now: ${asset.venues.filter((v) => v.category === "NIGHTCLUB").length}`);