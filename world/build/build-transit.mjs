// Stations into the overworld asset  (Beads ady.1 / ady.2). Reads the terrain
// asset + fetched stations, projects each to a walkable tile, dedupes by
// name/tile, classifies U- vs S-Bahn, marks the tile as a station, and writes
// asset.stations. Data © OpenStreetMap contributors, ODbL. Run from repo root.

import { readFileSync, writeFileSync } from "node:fs";
import { WIDTH as W, HEIGHT as H, project } from "../lib/projection.mjs";

const asset = JSON.parse(
  readFileSync("public/world/berlin-overworld.json", "utf8"),
);
const osm = JSON.parse(readFileSync("world/osm/transit.json", "utf8"));
const tiles = asset.tiles.split("");

const walkable = (i) => tiles[i] !== "w" && tiles[i] !== "r";

// Find a walkable tile at or near (x,y); returns index or -1.
function placeNear(x, y) {
  for (let r = 0; r <= 3; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const nx = x + dx,
          ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const i = ny * W + nx;
        if (walkable(i)) return i;
      }
    }
  }
  return -1;
}

const seenName = new Set();
const usedTile = new Set();
const stations = [];
for (const el of osm.elements) {
  const t = el.tags || {};
  if (!t.name || seenName.has(t.name)) continue;
  const lon = el.lon ?? el.center?.lon;
  const lat = el.lat ?? el.center?.lat;
  if (lon == null || lat == null) continue;
  const p = project(lon, lat);
  if (p.x < 0 || p.y < 0 || p.x >= W || p.y >= H) continue;
  const i = placeNear(p.x, p.y);
  if (i < 0) continue;
  const key = `${i}`;
  if (usedTile.has(key)) continue;
  usedTile.add(key);
  seenName.add(t.name);

  const kind = t.station === "subway" || t.subway === "yes" ? "U" : "S";
  const x = i % W,
    y = Math.floor(i / W);
  tiles[i] = "s";
  stations.push({ id: `${el.type}/${el.id}`, name: t.name, x, y, kind });
}

asset.stations = stations;
asset.tiles = tiles.join("");
writeFileSync("public/world/berlin-overworld.json", JSON.stringify(asset));

const byKind = {};
for (const s of stations) byKind[s.kind] = (byKind[s.kind] || 0) + 1;
console.log("stations placed:", stations.length, JSON.stringify(byKind));
