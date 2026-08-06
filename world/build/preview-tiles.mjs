// Dev tool: render the original pixel-art tiles/sprites to a PNG so they can be
// eyeballed. Pattern data mirrors game/renderer/tiles.ts (the tested source of
// truth). Run from repo root: node world/build/preview-tiles.mjs

import zlib from "node:zlib";
import { writeFileSync } from "node:fs";

const TILE_PATTERNS = {
  water: { palette: { ".": "#2a4d69", "~": "#3a6a8c" }, rows: ["........", "..~~....", "........", "......~~", "...~~...", "........", "~~......", "....~~.."] },
  park: { palette: { ".": "#2f6b3a", ",": "#3f7d47", T: "#245a2c", t: "#5a3a22" }, rows: [".,...TT.", ".,..TTT.", "..,.TT..", ".,..t...", ",..,..,.", "..,...,.", ".,..,...", ",...,..,"] },
  street: { palette: { ".": "#3a3a3a", ":": "#454545", _: "#2f2f2f" }, rows: ["...:....", "........", ":..._...", "........", "...:...:", "_.......", "....:...", "........"] },
  building: { palette: { "#": "#3f3f3f", ".": "#5a5a5a", w: "#b7c4d0" }, rows: ["########", "#.ww.ww#", "#.ww.ww#", "#......#", "#.ww.ww#", "#.ww.ww#", "#......#", "########"] },
  rail: { palette: { ".": "#3a2f22", "=": "#8a6a3a", t: "#5a4020" }, rows: ["..=..=..", "..=..=..", "tt=tt=tt", "..=..=..", "..=..=..", "tt=tt=tt", "..=..=..", "..=..=.."] },
  plaza: { palette: { ".": "#6d5a3f", "-": "#5c4a32", "|": "#7a664a" }, rows: ["...|....", "--------", "...|....", "...|....", "--------", "|.......", "|.......", "--------"] },
  venue: { palette: { "#": "#8a6a1a", ".": "#b08d2a", D: "#d8b64a", d: "#5a3a12" }, rows: ["########", "#.DDDD.#", "#.D..D.#", "#.DDDD.#", "#..dd..#", "#..dd..#", "#..dd..#", "########"] },
};
const SPRITES = {
  hero: { palette: { ".": null, h: "#5a3a20", s: "#e8c9a0", b: "#3a6ea5", B: "#2a4a70" }, rows: ["..hhhh..", "..hssh..", "..ssss..", "..bBBb..", ".bbBBbb.", "..bBBb..", "..b..b..", "..s..s.."] },
  foe: { palette: { ".": null, R: "#c0392b", e: "#f1c40f" }, rows: ["..RRRR..", ".RRRRRR.", "RRRRRRRR", "ReRRRReR", "RRRRRRRR", "RRRRRRRR", ".RRRRRR.", "..R..R.."] },
};

const items = [...Object.entries(TILE_PATTERNS), ...Object.entries(SPRITES)];
const CELL = 8, TILE = CELL * 8, GAP = 4;
const W = items.length * TILE + (items.length - 1) * GAP;
const H = TILE;
const buf = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) { buf[i * 4] = 48; buf[i * 4 + 1] = 48; buf[i * 4 + 2] = 48; buf[i * 4 + 3] = 255; }
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const put = (x, y, r, g, b) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const o = (y * W + x) * 4; buf[o] = r; buf[o + 1] = g; buf[o + 2] = b; buf[o + 3] = 255; };

items.forEach(([, p], idx) => {
  const x0 = idx * (TILE + GAP);
  for (let ry = 0; ry < 8; ry++) for (let rx = 0; rx < 8; rx++) {
    const c = p.palette[p.rows[ry][rx]];
    if (!c) continue;
    const [r, g, b] = hex(c);
    for (let dy = 0; dy < CELL; dy++) for (let dx = 0; dx < CELL; dx++) put(x0 + rx * CELL + dx, ry * CELL + dy, r, g, b);
  }
});

const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const t = Buffer.from(type, "ascii"); const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0); return Buffer.concat([len, t, data, crc]); };

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
const raw = Buffer.alloc(H * (1 + W * 4));
for (let y = 0; y < H; y++) { raw[y * (1 + W * 4)] = 0; for (let x = 0; x < W * 4; x++) raw[y * (1 + W * 4) + 1 + x] = buf[y * W * 4 + x]; }
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
writeFileSync("world/tileset-preview.png", png);
console.log("wrote world/tileset-preview.png", W + "x" + H, "order:", items.map(([n]) => n).join(", "));
