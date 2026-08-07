import { describe, it, expect } from "vitest";
import { SPRITES, TILE_PATTERNS, type TilePattern } from "@/game";

const all: Record<string, TilePattern> = { ...TILE_PATTERNS, ...SPRITES };

describe("pixel-art patterns", () => {
  it("are square (8 or 16) and every cell maps to a palette entry", () => {
    for (const [name, p] of Object.entries(all)) {
      const n = p.rows.length;
      expect(n === 8 || n === 16, `${name}: rows must be 8 or 16, got ${n}`).toBe(
        true,
      );
      for (const row of p.rows) {
        expect(row.length, `${name}: row width must equal ${n}`).toBe(n);
        for (const ch of row) {
          expect(ch in p.palette, `${name}: unmapped '${ch}'`).toBe(true);
        }
      }
    }
  });
});
