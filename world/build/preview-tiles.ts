// Dev tool: render the ACTUAL tile/sprite patterns (imported from the source of
// truth, not duplicated) to a PNG so they can be eyeballed. Resolution-agnostic:
// each pattern draws at its own row count, so 8x8 and 16x16 mix freely.
// Run from repo root: npx tsx world/build/preview-tiles.ts

import { writeFileSync } from "node:fs";
import zlib from "node:zlib";
import { SPRITES, TILE_PATTERNS } from "../../game/renderer/tiles";

const items = [...Object.entries(TILE_PATTERNS), ...Object.entries(SPRITES)];
const TILE = 64;
const GAP = 4;
const W = items.length * TILE + (items.length - 1) * GAP;
const H = TILE;

const buf = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) {
  buf[i * 4] = 48;
  buf[i * 4 + 1] = 48;
  buf[i * 4 + 2] = 48;
  buf[i * 4 + 3] = 255;
}
const hex = (h: string) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
const put = (x: number, y: number, r: number, g: number, b: number) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const o = (y * W + x) * 4;
  buf[o] = r;
  buf[o + 1] = g;
  buf[o + 2] = b;
  buf[o + 3] = 255;
};

items.forEach(([, p], idx) => {
  const n = p.rows.length;
  const cell = TILE / n;
  const x0 = idx * (TILE + GAP);
  for (let ry = 0; ry < n; ry++) {
    const row = p.rows[ry];
    for (let rx = 0; rx < row.length; rx++) {
      const c = p.palette[row[rx]];
      if (!c) continue;
      const [r, g, b] = hex(c);
      for (let dy = 0; dy < cell; dy++)
        for (let dx = 0; dx < cell; dx++)
          put(Math.floor(x0 + rx * cell + dx), Math.floor(ry * cell + dy), r, g, b);
    }
  }
});

const CRC = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (b: Buffer) => {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type: string, data: Buffer) => {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;
ihdr[9] = 6;
const raw = Buffer.alloc(H * (1 + W * 4));
for (let y = 0; y < H; y++) {
  raw[y * (1 + W * 4)] = 0;
  for (let x = 0; x < W * 4; x++) raw[y * (1 + W * 4) + 1 + x] = buf[y * W * 4 + x];
}
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", ihdr),
  chunk("IDAT", zlib.deflateSync(raw)),
  chunk("IEND", Buffer.alloc(0)),
]);
writeFileSync("world/tileset-preview.png", png);
console.log("wrote world/tileset-preview.png", W + "x" + H, "items:", items.length);
