// Districts + venues into the overworld asset  (Beads 3rx.5 / 3rx.6).
// Reads the terrain asset produced by build-overworld.mjs, assigns every
// inside-Ring tile a district (nearest Ortsteil label), places a capped,
// spatially-spread set of venues on walkable tiles, and rewrites the asset.
// Data © OpenStreetMap contributors, ODbL. Run from repo root.

import { readFileSync, writeFileSync } from "node:fs";
import { WIDTH as W, HEIGHT as H, project } from "../lib/projection.mjs";

const asset = JSON.parse(
  readFileSync("public/world/berlin-overworld.json", "utf8"),
);
const osm = JSON.parse(readFileSync("world/osm/places.json", "utf8"));
const tiles = asset.tiles.split("");

const coordOf = (el) =>
  el.lat != null ? { lon: el.lon, lat: el.lat } : el.center;

// ---- districts: nearest of the Ortsteil/quarter labels --------------------
const labels = [];
for (const el of osm.elements) {
  const t = el.tags || {};
  if ((t.place === "suburb" || t.place === "quarter") && t.name) {
    const c = coordOf(el);
    if (c) labels.push({ name: t.name, ...project(c.lon, c.lat) });
  }
}
const districts = [...new Set(labels.map((l) => l.name))];
const idxOfName = new Map(districts.map((n, i) => [n, i]));

let districtGrid = "";
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (tiles[y * W + x] === "r") {
      districtGrid += " "; // outside the Ring
      continue;
    }
    let best = -1,
      bestD = Infinity;
    for (const l of labels) {
      const d = (l.x - x) ** 2 + (l.y - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = idxOfName.get(l.name);
      }
    }
    districtGrid += String.fromCharCode(48 + best); // '0'..
  }
}

// ---- venues: classify, place on walkable tiles, capped + spread -----------
function categorize(t = {}) {
  const { amenity: a, shop: s } = t;
  if (a === "nightclub") return "NIGHTCLUB";
  if (a === "bar" || a === "pub" || a === "biergarten") return "BAR";
  if (a === "restaurant" || a === "cafe" || a === "fast_food") return "RESTAURANT";
  if (["supermarket", "greengrocer", "butcher", "bakery", "general", "department_store"].includes(s)) return "GROCERY";
  if (s === "convenience" || s === "kiosk") return "SPAETI";
  if (s === "clothes" || s === "boutique") return "CLOTHING";
  if (s === "sports" || s === "outdoor") return "SPORT";
  if (s === "hunting" || s === "weapons") return "ARMOURY";
  return null;
}

const candidates = [];
for (const el of osm.elements) {
  const cat = categorize(el.tags);
  if (!cat) continue;
  const c = coordOf(el);
  if (!c) continue;
  const { x, y } = project(c.lon, c.lat);
  if (x < 0 || y < 0 || x >= W || y >= H) continue;
  if (tiles[y * W + x] !== ".") continue; // walkable street tiles only
  candidates.push({
    id: `${el.type}/${el.id}`,
    name: el.tags.name || cat[0] + cat.slice(1).toLowerCase(),
    category: cat,
    x,
    y,
  });
}

const BUDGET = 600;
const PRIORITY = new Set(["NIGHTCLUB", "ARMOURY", "SPORT"]);
// Scatter non-priority venues so placement isn't clustered by OSM ordering.
const scatter = (v) => ((v.x * 73856093) ^ (v.y * 19349663)) >>> 0;
const ordered = [
  ...candidates.filter((v) => PRIORITY.has(v.category)),
  ...candidates.filter((v) => !PRIORITY.has(v.category)).sort((a, b) => scatter(a) - scatter(b)),
];

const occupied = new Set([`${asset.spawn.x},${asset.spawn.y}`]);
const venues = [];
for (const v of ordered) {
  if (venues.length >= BUDGET && !PRIORITY.has(v.category)) continue;
  const key = `${v.x},${v.y}`;
  if (occupied.has(key)) continue;
  occupied.add(key);
  venues.push(v);
  tiles[v.x + v.y * W] = "v";
}

asset.districts = districts;
asset.districtGrid = districtGrid;
asset.venues = venues;
asset.tiles = tiles.join("");
writeFileSync("public/world/berlin-overworld.json", JSON.stringify(asset));

const byCat = {};
for (const v of venues) byCat[v.category] = (byCat[v.category] || 0) + 1;
console.log("districts:", districts.length, "->", districts.slice(0, 8).join(", "), "...");
console.log("venues placed:", venues.length, JSON.stringify(byCat));
