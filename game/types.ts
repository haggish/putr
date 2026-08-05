// Core engine types. Pure data — no DOM, no Prisma. Safe to import from
// server components, client components, and tests alike.

export type Vec2 = { x: number; y: number };

export type Direction = "north" | "south" | "east" | "west";

export const DIRECTIONS: Record<Direction, Vec2> = {
  north: { x: 0, y: -1 },
  south: { x: 0, y: 1 },
  east: { x: 1, y: 0 },
  west: { x: -1, y: 0 },
};

/** Visual/semantic class of a single overworld tile ("a block", ~40 m). */
export type TileKind =
  | "water" // Spree, canals, lakes — impassable
  | "street" // walkable ground
  | "building" // city blocks — impassable
  | "park" // green, walkable
  | "rail" // the Ring & tracks — impassable barrier
  | "plaza" // open squares — walkable
  | "venue"; // enterable location marker — walkable, carries a locationId

export interface Tile {
  kind: TileKind;
  /** District this tile belongs to (flavor, encounters, shop distribution). */
  district?: string;
  /** Set when kind === "venue": the enterable location. */
  locationId?: string;
}

export interface GameMap {
  id: string;
  width: number;
  height: number;
  /** Row-major tiles, length === width * height. */
  tiles: Tile[];
}

/** The screen the party is currently interacting with. Extensible: interiors,
 *  the night-club dungeon, and combat all become modes over the same core. */
export type GameMode = "overworld" | "interior" | "dungeon" | "combat";

/** A single stack in the party's pack. */
export interface InventoryItem {
  name: string;
  kind: string;
  value: number;
  qty: number;
}

export interface Party {
  /** Position in tile coordinates on the current map. */
  position: Vec2;
  facing: Direction;
  /** Purse. The full character roster (race/stats/HP) lands in the RPG bead. */
  gold: number;
  inventory: InventoryItem[];
}

export interface GameState {
  worldId: string;
  mode: GameMode;
  /** The map currently being walked (overworld or an interior sub-map). */
  currentMap: GameMap;
  party: Party;
  /** Rolling message log rendered in the HUD. */
  log: string[];
  /** Name of the venue currently inside (when mode === "interior"). */
  locationName?: string;
  /** Category of the venue currently inside (drives its shop catalog). */
  locationCategory?: string;
  /** Where to restore to when leaving an interior. */
  returnTo?: { map: GameMap; position: Vec2; mode: GameMode };
}