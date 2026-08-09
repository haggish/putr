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
  | "venue" // enterable location marker — walkable, carries a locationId
  | "station" // U-/S-Bahn station — walkable, board here to fast-travel
  | "bridge"; // walkable crossing carved over water

export interface Tile {
  kind: TileKind;
  /** District this tile belongs to (flavor, encounters, shop distribution). */
  district?: string;
  /** Set when kind === "venue": the enterable location. */
  locationId?: string;
  /** Set when kind === "venue": the venue's category (drives its map look). */
  venueCategory?: string;
  /** Set when kind === "venue": the venue's name (for named-landmark icons). */
  venueName?: string;
  /** Michelin star count (1–3) for a starred restaurant; drives a star marker. */
  venueStars?: number;
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
  /** Combat contribution when equipped (weapons/armor). */
  attack?: number;
  defense?: number;
}

export type Race = "HUMAN" | "ELF" | "DWARF" | "HALFLING" | "GNOME";

export type CharacterClass =
  | "FIGHTER"
  | "CLERIC"
  | "WIZARD"
  | "THIEF"
  | "PALADIN"
  | "RANGER"
  | "BARBARIAN"
  | "DRUID";

export type EquipSlot = "weapon" | "armor" | "shield";

export interface EquippedItem {
  name: string;
  kind: string;
  attack: number;
  defense: number;
  value: number;
}

export interface Character {
  name: string;
  race: Race;
  class: CharacterClass;
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  stats: { str: number; dex: number; int: number; wis: number };
  equipment: Partial<Record<EquipSlot, EquippedItem>>;
}

export interface Party {
  /** Position in tile coordinates on the current map. */
  position: Vec2;
  facing: Direction;
  /** Purse shared by the party. */
  gold: number;
  inventory: InventoryItem[];
  /** The adventuring roster. */
  members: Character[];
}

/** A fighter on the battle grid (a party member or a monster). */
export interface Combatant {
  id: string;
  name: string;
  side: "party" | "monster";
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  /** Party combatants reference their roster index (to write HP back). */
  memberIndex?: number;
  /** Monster gold reward on defeat. */
  reward?: number;
  /** Monster XP reward on defeat. */
  xpReward?: number;
  /** Sprite key for rendering (monsters); falls back to "foe". */
  sprite?: string;
}

export interface CombatState {
  combatants: Combatant[];
  /** Id of the party combatant whose turn it is. */
  activeId?: string;
  log: string[];
  outcome?: "won" | "lost" | "fled";
  /** Where to restore to when combat ends (its own slot, so a fight can nest
   *  inside a dungeon interior without clobbering the interior's returnTo). */
  return?: { map: GameMap; position: Vec2; mode: GameMode };
}

export interface GameState {
  worldId: string;
  mode: GameMode;
  /** The map currently being walked (overworld or an interior sub-map). */
  currentMap: GameMap;
  party: Party;
  /** Present while mode === "combat". */
  combat?: CombatState;
  /** Rolling message log rendered in the HUD. */
  log: string[];
  /** Name of the venue currently inside (when mode === "interior"). */
  locationName?: string;
  /** Category of the venue currently inside (drives its shop catalog). */
  locationCategory?: string;
  /** District of the venue currently inside (flavours the keeper's persona). */
  locationDistrict?: string;
  /** Cuisine of the venue currently inside (restaurants). */
  locationCuisine?: string[];
  /** Price level 1–5 of the venue currently inside. */
  locationPrice?: number;
  /** Signature dishes of the venue currently inside — its shop menu. */
  locationEats?: string[];
  /** Where to restore to when leaving an interior. */
  returnTo?: { map: GameMap; position: Vec2; mode: GameMode };
  /** Present when the current interior is a night-club dungeon. */
  dungeon?: { doorAt: Vec2; bossAt: Vec2; cleared: boolean };
  /** A stationary shop keeper standing in the current interior (impassable).
   *  `sprite` is the trade-specific look (bartender, smith, …); `overlay` is an
   *  optional hat/hair drawn on top so same-trade keepers vary. */
  keeper?: { x: number; y: number; sprite: string; overlay?: string };
}