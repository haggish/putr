import { describe, it, expect } from "vitest";
import {
  SPRITES,
  TILE_PATTERNS,
  VENUE_TILES,
  VENUE_LANDMARK_TILES,
  venueIconKey,
  type TilePattern,
} from "@/game";

const all: Record<string, TilePattern> = {
  ...TILE_PATTERNS,
  ...SPRITES,
  ...VENUE_TILES,
  ...VENUE_LANDMARK_TILES,
};

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

  it("picks a venue bitmap by category, name override, or default", () => {
    expect(venueIconKey(undefined, "BAR")).toBe("BAR");
    expect(venueIconKey("Späti 24", "SPAETI")).toBe("SPAETI");
    // A named-landmark override wins over the category.
    expect(venueIconKey("Berliner Fernsehturm", "LANDMARK")).toBe("fernsehturm");
    expect(venueIconKey("Brandenburger Tor", "LANDMARK")).toBe("brandenburg");
    expect(venueIconKey("Siegessäule", "LANDMARK")).toBe("siegessaule");
    expect(venueIconKey("Reichstag", "LANDMARK")).toBe("reichstag");
    expect(venueIconKey("Berliner Dom", "LANDMARK")).toBe("berlinerdom");
    // Unknown / OTHER falls back to the gold default.
    expect(venueIconKey("Some Place", "OTHER")).toBe("DEFAULT");
    expect(venueIconKey()).toBe("DEFAULT");
  });
});
