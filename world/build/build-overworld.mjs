// Rasterize OSM terrain into the overworld asset  (Beads 3rx.4 / 3rx.7).
// Base is walkable "street"; parks/green carve in, water carves over that, and
// everything outside the Ring becomes the impassable "rail" border. Emits a
// compact string-encoded tile grid the engine loads at runtime.
// Data © OpenStreetMap contributors, ODbL. Run from repo root.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import {
  WIDTH as W,
  HEIGHT as H,
  METERS_PER_TILE,
  project,
  unproject,
  pointInPolygon,
  insideRing,
} from "../lib/projection.mjs";

const osm = JSON.parse(readFileSync("world/osm/terrain.json", "utf8"));

// Tile codes must match CODE_TO_KIND in game/world-asset.ts.
const STREET = 0,
  PARK = 1,
  WATER = 2,
  RAIL = 3;
const CODE = [".", "p", "w", "r"];

const isWater = (t = {}) => t.natural === "water" || !!t.water || !!t.waterway;

function ringsOf(el) {
  if (el.type === "way" && el.geometry) {
    return [el.geometry.map((g) => [g.lon, g.lat])];
  }
  if (el.type === "relation" && el.members) {
    return el.members
      .filter((m) => m.geometry && m.role !== "inner")
      .map((m) => m.geometry.map((g) => [g.lon, g.lat]));
  }
  return [];
}

const grid = new Uint8Array(W * H); // defaults to STREET (0)

function paint(el, code) {
  for (const ring of ringsOf(el)) {
    if (ring.length < 3) continue;
    let minx = Infinity,
      miny = Infinity,
      maxx = -Infinity,
      maxy = -Infinity;
    for (const [lon, lat] of ring) {
      const t = project(lon, lat);
      if (t.x < minx) minx = t.x;
      if (t.x > maxx) maxx = t.x;
      if (t.y < miny) miny = t.y;
      if (t.y > maxy) maxy = t.y;
    }
    minx = Math.max(0, minx);
    miny = Math.max(0, miny);
    maxx = Math.min(W - 1, maxx);
    maxy = Math.min(H - 1, maxy);
    for (let y = miny; y <= maxy; y++) {
      for (let x = minx; x <= maxx; x++) {
        const c = unproject(x, y);
        if (pointInPolygon(c.lon, c.lat, ring)) grid[y * W + x] = code;
      }
    }
  }
}

console.time("rasterize");
for (const el of osm.elements) if (!isWater(el.tags)) paint(el, PARK);
for (const el of osm.elements) if (isWater(el.tags)) paint(el, WATER);
// Clip to the Ring last so the border reads cleanly.
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const c = unproject(x, y);
    if (!insideRing(c.lon, c.lat)) grid[y * W + x] = RAIL;
  }
}
console.timeEnd("rasterize");

// Spawn: nearest walkable street tile to the map center (spiral out).
function findSpawn() {
  const cx = Math.floor(W / 2),
    cy = Math.floor(H / 2);
  for (let r = 0; r < Math.max(W, H); r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx,
          y = cy + dy;
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        if (grid[y * W + x] === STREET) return { x, y };
      }
    }
  }
  return { x: cx, y: cy };
}
const spawn = findSpawn();

let tiles = "";
for (let i = 0; i < W * H; i++) tiles += CODE[grid[i]];

const asset = {
  id: "berlin-ring",
  attribution: "© OpenStreetMap contributors (ODbL)",
  width: W,
  height: H,
  metersPerTile: METERS_PER_TILE,
  spawn,
  tiles,
};
mkdirSync("public/world", { recursive: true });
writeFileSync("public/world/berlin-overworld.json", JSON.stringify(asset));

const counts = {};
for (let i = 0; i < W * H; i++) {
  const c = CODE[grid[i]];
  counts[c] = (counts[c] || 0) + 1;
}
console.log("grid", W + "x" + H, "spawn", JSON.stringify(spawn));
console.log("tile counts", JSON.stringify(counts));
