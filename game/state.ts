// Initial state + a placeholder map so the engine runs before the real
// Berlin world asset exists. The load-world bead replaces placeholderMap()
// with the OSM-derived 256x256 overworld.

import type { GameMap, GameState, Tile, TileKind } from "./types";
import { createDefaultParty } from "./systems/party";

/** A tiny hand-made map used only until the world-data pipeline produces the
 *  real inside-the-Ring asset. Border tiles are `rail` to evoke the Ring. */
export function placeholderMap(width = 24, height = 24): GameMap {
  const tiles: Tile[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let kind: TileKind = "street";
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        kind = "rail"; // the Ring as an impassable border
      } else if (x % 5 === 0 && y % 3 === 0) {
        kind = "building";
      } else if (x > 8 && x < 14 && y > 8 && y < 14) {
        kind = "park";
      }
      tiles.push({ kind, district: "Placeholder" });
    }
  }
  // A single enterable venue to walk onto (interior transition, later bead).
  tiles[3 * width + 3] = {
    kind: "venue",
    district: "Placeholder",
    locationId: "demo-bar",
  };
  return { id: "placeholder", width, height, tiles };
}

export function createInitialState(worldId = "placeholder"): GameState {
  return {
    worldId,
    mode: "overworld",
    currentMap: placeholderMap(),
    party: {
      position: { x: 2, y: 2 },
      facing: "south",
      gold: 150,
      inventory: [],
      members: createDefaultParty(),
    },
    log: ["Welcome to Penultimate I — The Ring."],
  };
}
