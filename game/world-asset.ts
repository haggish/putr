// Runtime loader for the bundled overworld asset (Beads ua1.4 / load-world).
// The build pipeline (world/build/*) emits a compact, string-encoded tile grid
// plus district + venue layers; this decodes them into engine structures. The
// char codes here MUST match build-overworld.mjs.

import type { GameMap, GameState, Tile, TileKind } from "./types";
import { createDefaultParty } from "./systems/party";

export interface VenueInfo {
  id: string;
  name: string;
  category: string;
  x: number;
  y: number;
  /** Michelin star count (1–3), when the venue is a starred restaurant. */
  stars?: number;
  /** Cuisine tags (restaurants), e.g. ["Thai"] or ["Lebanese","Syrian"]. */
  cuisine?: string[];
  /** Price level 1–5 (€–€€€€€). */
  priceLevel?: number;
  /** Signature dishes ("Eats") — the real menu the shop is built from. */
  eats?: string[];
}

export interface Station {
  id: string;
  name: string;
  x: number;
  y: number;
  /** "U" (U-Bahn) or "S" (S-Bahn). */
  kind: string;
}

export interface WorldAsset {
  id: string;
  width: number;
  height: number;
  /** width*height chars, one per tile (see CODE_TO_KIND). */
  tiles: string;
  spawn: { x: number; y: number };
  metersPerTile?: number;
  attribution?: string;
  /** District names; districtGrid chars index into this (code = char - 48). */
  districts?: string[];
  districtGrid?: string;
  venues?: VenueInfo[];
  stations?: Station[];
}

const CODE_TO_KIND: Record<string, TileKind> = {
  ".": "street",
  p: "park",
  w: "water",
  r: "rail",
  v: "venue",
  b: "building",
  z: "plaza",
  s: "station",
};

export function mapFromAsset(asset: WorldAsset): GameMap {
  const { width, height, tiles, districts, districtGrid, venues } = asset;
  const out: Tile[] = new Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const tile: Tile = { kind: CODE_TO_KIND[tiles[i]] ?? "street" };
    if (districts && districtGrid && districtGrid[i] !== " ") {
      tile.district = districts[districtGrid.charCodeAt(i) - 48];
    }
    out[i] = tile;
  }
  // Attach venue identity so stepping onto a venue tile can enter it.
  if (venues) {
    for (const v of venues) {
      const t = out[v.y * width + v.x];
      if (t) {
        t.kind = "venue";
        t.locationId = v.id;
        t.venueCategory = v.category;
        t.venueName = v.name;
        if (v.stars) t.venueStars = v.stars;
      }
    }
  }
  return { id: asset.id, width, height, tiles: out };
}

/** Lookup of venue by "x,y" tile key — used for HUD / enter-location. */
export function venueMap(asset: WorldAsset): Map<string, VenueInfo> {
  const m = new Map<string, VenueInfo>();
  for (const v of asset.venues ?? []) m.set(`${v.x},${v.y}`, v);
  return m;
}

export function stationList(asset: WorldAsset): Station[] {
  return asset.stations ?? [];
}

/** Lookup of station by "x,y" tile key — used to detect boarding. */
export function stationMap(asset: WorldAsset): Map<string, Station> {
  const m = new Map<string, Station>();
  for (const s of asset.stations ?? []) m.set(`${s.x},${s.y}`, s);
  return m;
}

export function stateFromAsset(asset: WorldAsset): GameState {
  return {
    worldId: asset.id,
    mode: "overworld",
    currentMap: mapFromAsset(asset),
    party: {
      position: { x: asset.spawn.x, y: asset.spawn.y },
      facing: "south",
      gold: 150,
      inventory: [],
      members: createDefaultParty(),
    },
    log: ["You stand within the Ring. Berlin sprawls around you."],
  };
}
