// Extract the Berlin Food Stories map dump (dump.html at repo root — the JSON
// response of the /map?budget=... fetch) into world/bfs-places.json: name, slug,
// real lon/lat, cuisine tags, a 1-5 price level, and the "Eats" dish list. Only
// places inside the Ring are kept. Re-run whenever you drop a fresh dump.html.
//
//   node world/build/extract-bfs.mjs

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { insideRing } from "../lib/projection.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const DUMP = join(here, "..", "..", "dump.html");
const OUT = join(here, "..", "bfs-places.json");

if (!existsSync(DUMP)) {
  console.error("dump.html not found at repo root — drop the map fetch response there first.");
  process.exit(1);
}

const dec = (s) =>
  (s || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&#039;/g, "'").replace(/&quot;/g, '"')
    .replace(/&eacute;/g, "é").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ").trim();

const raw = readFileSync(DUMP, "utf8");
// Tolerate stray leading/trailing characters from copy-paste / editor saves.
const j = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
const blocks = j.placesList.split(/(?=<li class="places__list__place")/).filter((b) => b.includes("data-lat"));

const tagList = (block, label) => {
  const m = block.match(new RegExp(`<h3 class="tag">${label}[^<]*</h3>\\s*<ul>([\\s\\S]*?)</ul>`));
  if (!m) return [];
  return [...m[1].matchAll(/<li class="t-tag">([^<]+)<\/li>/g)].map((x) => dec(x[1]));
};

const seen = new Set();
const places = [];
for (const b of blocks) {
  const lat = Number(b.match(/data-lat="([-\d.]+)"/)?.[1]);
  const lon = Number(b.match(/data-lon="([-\d.]+)"/)?.[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
  if (!insideRing(lon, lat)) continue;
  const slug = b.match(/data-name="([^"]*)"/)?.[1] || "";
  const name = dec(b.match(/article-teaser__headline">\s*<a[^>]*>([^<]+)<\/a>/)?.[1] || slug);
  // Category block: the --sq tag is the district; the rest are cuisine tags.
  const cat = b.match(/article-teaser__categories">([\s\S]*?)<div class="article-teaser__card"/)?.[1] || "";
  const cuisine = [...cat.matchAll(/<span class="t-tag">([^<]+)<\/span>/g)].map((x) => dec(x[1])).slice(0, 3);
  const price = Number(b.match(/budget-icons" data-count="(\d+)"/)?.[1] || 0) || undefined;
  const eats = tagList(b, "Eats").slice(0, 6);
  // Dedupe exact (slug,lat,lon) repeats if any.
  const key = `${slug}@${lat},${lon}`;
  if (seen.has(key)) continue;
  seen.add(key);
  places.push({ name, slug, lat, lon, cuisine, price, eats });
}

writeFileSync(OUT, JSON.stringify(places));
const withEats = places.filter((p) => p.eats.length).length;
const withPrice = places.filter((p) => p.price).length;
console.log(
  `Wrote ${places.length} inside-Ring places to bfs-places.json (${withEats} with dishes, ${withPrice} with a price level).`,
);