// Original pixel-art tiles (Beads nwe.4 / ua1.2 / q7z.2). Each tile kind and
// sprite is an 8x8 grid of palette keys, hand-authored for this project — no
// external or copyrighted assets. The renderer pre-bakes these to a tile atlas.

import type { TileKind } from "../types";

export interface TilePattern {
  /** Map from a grid character to a color; `null` = transparent. */
  palette: Record<string, string | null>;
  /** 8 rows of 8 characters. */
  rows: string[];
}

export const TILE_PATTERNS: Record<TileKind, TilePattern> = {
  water: {
    palette: { ".": "#2a4d69", "~": "#3a6a8c" },
    rows: [
      "........",
      "..~~....",
      "........",
      "......~~",
      "...~~...",
      "........",
      "~~......",
      "....~~..",
    ],
  },
  park: {
    palette: { ".": "#2f6b3a", ",": "#3f7d47", T: "#245a2c", t: "#5a3a22" },
    rows: [
      ".,...TT.",
      ".,..TTT.",
      "..,.TT..",
      ".,..t...",
      ",..,..,.",
      "..,...,.",
      ".,..,...",
      ",...,..,",
    ],
  },
  street: {
    palette: { ".": "#3a3a3a", ":": "#454545", _: "#2f2f2f" },
    rows: [
      "...:....",
      "........",
      ":..._...",
      "........",
      "...:...:",
      "_.......",
      "....:...",
      "........",
    ],
  },
  building: {
    palette: { "#": "#3f3f3f", ".": "#5a5a5a", w: "#b7c4d0" },
    rows: [
      "########",
      "#.ww.ww#",
      "#.ww.ww#",
      "#......#",
      "#.ww.ww#",
      "#.ww.ww#",
      "#......#",
      "########",
    ],
  },
  rail: {
    palette: { ".": "#3a2f22", "=": "#8a6a3a", t: "#5a4020" },
    rows: [
      "..=..=..",
      "..=..=..",
      "tt=tt=tt",
      "..=..=..",
      "..=..=..",
      "tt=tt=tt",
      "..=..=..",
      "..=..=..",
    ],
  },
  plaza: {
    palette: { ".": "#6d5a3f", "-": "#5c4a32", "|": "#7a664a" },
    rows: [
      "...|....",
      "--------",
      "...|....",
      "...|....",
      "--------",
      "|.......",
      "|.......",
      "--------",
    ],
  },
  venue: {
    palette: { "#": "#8a6a1a", ".": "#b08d2a", D: "#d8b64a", d: "#5a3a12" },
    rows: [
      "########",
      "#.DDDD.#",
      "#.D..D.#",
      "#.DDDD.#",
      "#..dd..#",
      "#..dd..#",
      "#..dd..#",
      "########",
    ],
  },
  station: {
    palette: { "#": "#16306a", ".": "#2a4b9b", o: "#e6ecf5" },
    rows: [
      "########",
      "#......#",
      "#.oooo.#",
      "#.o..o.#",
      "#.o..o.#",
      "#.oooo.#",
      "#......#",
      "########",
    ],
  },
};

export const SPRITES: Record<string, TilePattern> = {
  hero: {
    palette: { ".": null, h: "#5a3a20", s: "#e8c9a0", b: "#3a6ea5", B: "#2a4a70" },
    rows: [
      "..hhhh..",
      "..hssh..",
      "..ssss..",
      "..bBBb..",
      ".bbBBbb.",
      "..bBBb..",
      "..b..b..",
      "..s..s..",
    ],
  },
  // Generic fallback (an unmapped monster).
  foe: {
    palette: { ".": null, R: "#c0392b", e: "#f1c40f" },
    rows: [
      "..RRRR..",
      ".RRRRRR.",
      "RRRRRRRR",
      "ReRRRReR",
      "RRRRRRRR",
      "RRRRRRRR",
      ".RRRRRR.",
      "..R..R..",
    ],
  },
  // Drug Addict — gaunt, hunched, ragged.
  addict: {
    palette: { ".": null, h: "#4a4a4a", s: "#c9b8a0", r: "#6a5a4a" },
    rows: [
      "..hh....",
      ".hssh...",
      ".hssh...",
      "..rr....",
      ".rrrr...",
      ".r.rr...",
      ".r..r...",
      ".s..s...",
    ],
  },
  // Thief — hooded cloak, yellow eyes, a dagger.
  thief: {
    palette: { ".": null, d: "#2a2a35", e: "#e8d84a", b: "#9aa0aa", h: "#c9b8a0" },
    rows: [
      "..dddd..",
      ".ddddd..",
      ".deede..",
      ".ddddd..",
      ".dddd.b.",
      ".dddd.b.",
      ".ddddh..",
      ".dd.dd..",
    ],
  },
  // Wild Boar — four-legged brown beast with a tusk.
  boar: {
    palette: { ".": null, B: "#3a2414", b: "#5a3a22", t: "#e8e0c8", e: "#c0392b" },
    rows: [
      "........",
      "..BBBB..",
      ".BbbbbB.",
      "tBbebbB.",
      "tbbbbbb.",
      ".b.bb.b.",
      ".b.bb.b.",
      "........",
    ],
  },
  // Neon Wraith — glowing cyan ghost, white eyes.
  wraith: {
    palette: { ".": null, c: "#2ad6d6", C: "#1a9a9a", e: "#ffffff" },
    rows: [
      "..cccc..",
      ".cccccc.",
      ".ceccec.",
      ".cccccc.",
      ".cccccc.",
      ".cCcCcC.",
      ".c.c.c..",
      "..C.C...",
    ],
  },
  // U-Bahn Troll — bulky green brute with tusks.
  troll: {
    palette: { ".": null, G: "#3a5a2a", g: "#5a7a4a", e: "#e8d84a", t: "#e8e0c8" },
    rows: [
      ".GGGGG..",
      ".GeGeG..",
      ".GGGGG..",
      ".GtttG..",
      "GGGGGGG.",
      "GGgggGG.",
      ".Gg.gG..",
      ".g...g..",
    ],
  },
  // Rave Specter — purple translucent apparition, magenta eyes.
  specter: {
    palette: { ".": null, p: "#8a4ad6", P: "#5a2a9a", e: "#e84ad6" },
    rows: [
      "..pppp..",
      ".pPppPp.",
      ".peppep.",
      ".pppppp.",
      ".pPppPp.",
      ".p.pp.p.",
      "..p..p..",
      "...pp...",
    ],
  },
  // Techno Titan (boss) — armoured mech, red visor, gold shoulders.
  titan: {
    palette: { ".": null, m: "#8a8f99", M: "#4a4f59", e: "#e8480a", a: "#d8b64a" },
    rows: [
      ".mMMMm..",
      ".meeeM..",
      ".mMMMm..",
      "aMMMMMa.",
      "aMmmmMa.",
      ".MmmmM..",
      ".M.M.M..",
      ".m...m..",
    ],
  },
};

/** Paint an 8x8 pattern into `size` device pixels at (px, py). */
export function renderTilePattern(
  ctx: CanvasRenderingContext2D,
  pattern: TilePattern,
  px: number,
  py: number,
  size: number,
): void {
  const n = pattern.rows.length;
  const cell = size / n;
  for (let y = 0; y < n; y++) {
    const row = pattern.rows[y];
    for (let x = 0; x < row.length; x++) {
      const color = pattern.palette[row[x]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(
        Math.floor(px + x * cell),
        Math.floor(py + y * cell),
        Math.ceil(cell),
        Math.ceil(cell),
      );
    }
  }
}
