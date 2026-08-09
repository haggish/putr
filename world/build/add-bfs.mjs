// Curated overlay: replace the generic OSM restaurant layer with Berlin Food
// Stories' recommended places (the budget<=105 map, filtered to inside the
// Ring), keeping the Michelin-starred restaurants. Idempotent — re-run after a
// world rebuild. Source data: world/bfs-places.json (name, slug, real lon/lat).
//
//   node world/build/add-bfs.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { project } from "../lib/projection.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const ASSET = join(here, "..", "..", "public", "world", "berlin-overworld.json");
const PLACES = join(here, "..", "bfs-places.json");

const CODE = {
  ".": "street", p: "park", w: "water", r: "rail",
  v: "venue", b: "building", z: "plaza", s: "station",
};
const norm = (s) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
const slugify = (s) =>
  (s || "x").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "x";

const asset = JSON.parse(readFileSync(ASSET, "utf8"));
const places = JSON.parse(readFileSync(PLACES, "utf8"));
const { width: W, height: H, tiles } = asset;
const kindAt = (x, y) => CODE[tiles[y * W + x]] ?? "street";
const BLOCKED = new Set(["water", "rail"]);

// Keep everything that isn't a restaurant, plus the Michelin-starred ones; drop
// the original OSM restaurants and any previous BFS run.
const michelinNames = new Set(
  asset.venues
    .filter((v) => String(v.id).startsWith("michelin/"))
    .map((v) => norm(v.name)),
);
asset.venues = asset.venues.filter(
  (v) => v.category !== "RESTAURANT" || String(v.id).startsWith("michelin/"),
);

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

const usedIds = new Set();
let added = 0, skippedMichelin = 0, skippedFull = 0;
for (const p of places) {
  if (michelinNames.has(norm(p.name))) { skippedMichelin++; continue; } // keep the starred version
  const t0 = project(p.lon, p.lat);
  const spot = place(t0.x, t0.y);
  if (!spot) { skippedFull++; continue; }
  taken.add(`${spot.x},${spot.y}`);
  let id = `bfs/${p.slug ? slugify(p.slug) : slugify(p.name)}`;
  let n = 2;
  while (usedIds.has(id)) id = `bfs/${slugify(p.slug || p.name)}-${n++}`;
  usedIds.add(id);
  asset.venues.push({
    id,
    name: p.name,
    category: "RESTAURANT",
    x: spot.x,
    y: spot.y,
    ...(p.cuisine?.length ? { cuisine: p.cuisine } : {}),
    ...(p.price ? { priceLevel: p.price } : {}),
    ...(p.eats?.length ? { eats: p.eats } : {}),
  });
  added++;
}

const restaurants = asset.venues.filter((v) => v.category === "RESTAURANT").length;
writeFileSync(ASSET, JSON.stringify(asset));
console.log(
  `Added ${added} BFS restaurants (skipped ${skippedMichelin} that are Michelin, ${skippedFull} with no free tile).`,
);
console.log(`Restaurants now: ${restaurants} · total venues: ${asset.venues.length}`);