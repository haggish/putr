// Curated overlay: place Berlin's Michelin-starred restaurants (2026 guide) into
// the overworld asset as RESTAURANT venues carrying a `stars` count, so they get
// a star marker on the map. Idempotent — safe to re-run after a world rebuild.
//
//   node world/build/add-michelin.mjs
//
// Coordinates are real OSM lon/lat (from world/osm/places.json); the 3 newest
// one-stars (Loumi, Matthias, Pars) are best-effort OSM matches. Hallmann & Klee
// is omitted — it isn't in the extract and sits at the Ring's southern edge.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { project } from "../lib/projection.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const ASSET = join(here, "..", "..", "public", "world", "berlin-overworld.json");
const BFS = JSON.parse(readFileSync(join(here, "..", "bfs-places.json"), "utf8"));
// Curated dishes for starred places not in the BFS data (from public reviews).
const DISHES = JSON.parse(readFileSync(join(here, "..", "michelin-dishes.json"), "utf8"));

// Starred places overlap the Berlin Food Stories data (add-bfs skips them as
// Michelin dupes) — reuse it so they get cuisine, a price level, and dishes.
const normName = (s) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
const bfsByName = new Map(BFS.map((p) => [normName(p.name), p]));
function bfsMatch(name) {
  const k = normName(name);
  if (bfsByName.has(k)) return bfsByName.get(k);
  for (const [bk, bp] of bfsByName) if (bk.includes(k) || k.includes(bk)) return bp;
  return null;
}

// [name, stars, lon, lat]
const STARRED = [
  ["Rutz", 3, 13.38622, 52.52822],
  ["CODA", 2, 13.42744, 52.48995],
  ["FACIL", 2, 13.37374, 52.50878],
  ["Horváth", 2, 13.42081, 52.49638],
  ["Tim Raue", 2, 13.39153, 52.50698],
  ["Bandol sur mer", 1, 13.39534, 52.52906],
  ["Bonvivant", 1, 13.35373, 52.49461],
  ["Bricole", 1, 13.42240, 52.54100],
  ["Cookies Cream", 1, 13.38807, 52.51638],
  ["Golvet", 1, 13.36760, 52.50553],
  ["Hugos", 1, 13.34465, 52.50705],
  ["Irma la Douce", 1, 13.36396, 52.50148],
  ["Lorenz Adlon Esszimmer", 1, 13.37990, 52.51596],
  ["Loumi", 1, 13.41353, 52.50064],
  ["Matthias", 1, 13.41994, 52.53835],
  ["Nobelhart & Schmutzig", 1, 13.39054, 52.50539],
  ["Pars", 1, 13.32139, 52.50745],
  ["tulus lotrek", 1, 13.41365, 52.48962],
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

// Drop any previous run's entries so re-running stays clean.
asset.venues = asset.venues.filter((v) => !String(v.id).startsWith("michelin/"));
const taken = new Set(asset.venues.map((v) => `${v.x},${v.y}`));

// Nudge off water/rail (and off an already-taken tile) to the nearest good tile.
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
  return { x, y };
}

let added = 0;
for (const [name, stars, lon, lat] of STARRED) {
  const p0 = project(lon, lat);
  const { x, y } = place(p0.x, p0.y);
  taken.add(`${x},${y}`);
  // Replace any plain venue sitting exactly here so the star one is what shows.
  asset.venues = asset.venues.filter((v) => !(v.x === x && v.y === y));
  // Prefer the BFS entry; fall back to the curated dish list for the rest.
  const m = bfsMatch(name);
  const d = DISHES[name];
  const cuisine = m?.cuisine?.length ? m.cuisine : d?.cuisine;
  const priceLevel = m?.price || d?.price;
  const eats = m?.eats?.length ? m.eats : d?.eats;
  const extra = {};
  if (cuisine?.length) extra.cuisine = cuisine;
  if (priceLevel) extra.priceLevel = priceLevel;
  if (eats?.length) extra.eats = eats;
  asset.venues.push({ id: `michelin/${slug(name)}`, name, category: "RESTAURANT", x, y, stars, ...extra });
  added++;
}

writeFileSync(ASSET, JSON.stringify(asset));
console.log(`Added ${added} Michelin-starred restaurants. Total venues: ${asset.venues.length}`);
