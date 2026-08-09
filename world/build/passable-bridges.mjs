// Post-process the overworld asset so the walkable land is connected on foot.
//
// The base terrain has water (Spree + canals) but no bridges, so the walkable
// area is split into regions you can only reach by fast-travel. Real OSM bridge
// geometry isn't in the cached terrain data, so this carves minimal street
// "bridges" across water at the narrowest gaps between the disconnected walkable
// components (which is where real bridges tend to be). The Ring border (rail) is
// never carved. Idempotent: once connected, re-running is a no-op.
//
//   node world/build/passable-bridges.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const ASSET = join(here, "..", "..", "public", "world", "berlin-overworld.json");

const asset = JSON.parse(readFileSync(ASSET, "utf8"));
const W = asset.width, H = asset.height;
const tiles = asset.tiles.split("");
const idx = (x, y) => y * W + x;
const IMPASSABLE = new Set(["w", "r", "b"]); // water / rail / building
const isPassable = (i) => !IMPASSABLE.has(tiles[i]);
const MIN_COMP = 40; // ignore tiny specks

function components() {
  const cid = new Int32Array(W * H).fill(-1);
  const sizes = [];
  let n = 0;
  for (let i = 0; i < W * H; i++) {
    if (cid[i] >= 0 || !isPassable(i)) continue;
    const id = n++;
    let sz = 0;
    const st = [i];
    cid[i] = id;
    while (st.length) {
      const p = st.pop();
      sz++;
      const x = p % W, y = (p - x) / W;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const np = idx(nx, ny);
        if (cid[np] >= 0 || !isPassable(np)) continue;
        cid[np] = id;
        st.push(np);
      }
    }
    sizes[id] = sz;
  }
  return { cid, sizes };
}

// 0-1 BFS from every tile of the spawn's component: crossing a water tile costs
// 1, walking a passable tile costs 0, rail/building are blocked. Returns the
// nearest tile of another significant component and the predecessor map.
function nearestUnconnected(cid, spComp, targets) {
  const dist = new Int32Array(W * H).fill(1 << 30);
  const prev = new Int32Array(W * H).fill(-1);
  const cap = 4 * W * H;
  const buf = new Int32Array(cap);
  let head = cap >> 1, tail = cap >> 1; // deque grows both ways
  for (let i = 0; i < W * H; i++) if (cid[i] === spComp) { dist[i] = 0; buf[tail++] = i; }
  while (head < tail) {
    const cur = buf[head++];
    if (cid[cur] >= 0 && targets.has(cid[cur])) return { target: cur, prev };
    const d = dist[cur];
    const x = cur % W, y = (cur - x) / W;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const np = idx(nx, ny);
      const t = tiles[np];
      if (t === "r" || t === "b") continue; // never breach the Ring / buildings
      const nd = d + (t === "w" ? 1 : 0);
      if (nd < dist[np]) {
        dist[np] = nd;
        prev[np] = cur;
        if (t === "w") buf[tail++] = np;
        else buf[--head] = np; // 0-cost: front of the deque
      }
    }
  }
  return null;
}

let bridges = 0, carved = 0;
for (let iter = 0; iter < 500; iter++) {
  const { cid, sizes } = components();
  const spComp = cid[idx(asset.spawn.x, asset.spawn.y)];
  const targets = new Set();
  for (let id = 0; id < sizes.length; id++) {
    if (id !== spComp && sizes[id] >= MIN_COMP) targets.add(id);
  }
  if (!targets.size) break;
  const res = nearestUnconnected(cid, spComp, targets);
  if (!res) break; // nothing bridgeable (shouldn't happen)
  // Carve the water tiles along the path back to the spawn component.
  let cur = res.target, span = 0;
  while (cur !== -1) {
    if (tiles[cur] === "w") { tiles[cur] = "."; carved++; span++; }
    cur = res.prev[cur];
  }
  bridges++;
  console.log(`bridge ${bridges}: carved ${span} water tile(s)`);
}

asset.tiles = tiles.join("");
writeFileSync(ASSET, JSON.stringify(asset));

// Report final on-foot connectivity.
const { cid, sizes } = components();
const spComp = cid[idx(asset.spawn.x, asset.spawn.y)];
let total = 0, reach = 0;
for (let i = 0; i < W * H; i++) if (isPassable(i)) { total++; if (cid[i] === spComp) reach++; }
console.log(
  `\nCarved ${bridges} bridges (${carved} tiles). On-foot reachable: ${reach}/${total} (${(100 * reach / total).toFixed(1)}%).`,
);