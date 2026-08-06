import { describe, it, expect } from "vitest";
import { SPRITES, TILE_PATTERNS, type TilePattern } from "@/game";

const all: Record<string, TilePattern> = { ...TILE_PATTERNS, ...SPRITES };

describe("pixel-art patterns", () => {
  it("are 8x8 and every cell maps to a palette entry", () => {
    for (const [name, p] of Object.entries(all)) {
      expect(p.rows.length, `${name}: rows`).toBe(8);
      for (const row of p.rows) {
        expect(row.length, `${name}: row width`).toBe(8);
        for (const ch of row) {
          expect(ch in p.palette, `${name}: unmapped '${ch}'`).toBe(true);
        }
      }
    }
  });
});
