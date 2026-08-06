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
}

export interface CombatState {
  combatants: Combatant[];
  /** Id of the party combatant whose turn it is. */
  activeId?: string;
  log: string[];
  outcome?: "won" | "lost" | "fled";
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
  /** Where to restore to when leaving an interior. */
  returnTo?: { map: GameMap; position: Vec2; mode: GameMode };
}