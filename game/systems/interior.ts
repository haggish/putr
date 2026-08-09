// Interiors (Beads dyz.1 / dyz.2 / ua1.5). Pure functions that generate a small
// deterministic sub-map for a venue and switch the party in/out of it. Walls are
// impassable "building", the floor is walkable "plaza", and the door (a "venue"
// tile on the bottom wall) leads back outside. The full night-club dungeon is a
// separate bead; nightclubs here are just a larger room.

import type {
  GameMap,
  GameState,
  InventoryItem,
  Tile,
  TileKind,
} from "../types";
import { tileAt } from "../world";
import type { VenueInfo } from "../world-asset";

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function dimsFor(category: string): { width: number; height: number } {
  switch (category) {
    case "NIGHTCLUB":
      return { width: 15, height: 13 };
    case "BAR":
    case "RESTAURANT":
      return { width: 13, height: 11 };
    default:
      return { width: 11, height: 9 };
  }
}

export function buildInterior(venue: VenueInfo): GameMap {
  const { width, height } = dimsFor(venue.category);
  const tiles: Tile[] = new Array(width * height);
  const set = (x: number, y: number, kind: TileKind) => {
    tiles[y * width + x] = { kind };
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const border = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      set(x, y, border ? "building" : "plaza");
    }
  }

  const cx = Math.floor(width / 2);
  set(cx, height - 1, "venue"); // the door / exit

  const rnd = hash(venue.id);
  // Place furniture, but never on the border, the spawn row, or the door column
  // (so the exit is always reachable).
  const furnish = (x: number, y: number) => {
    if (x <= 0 || y <= 0 || x >= width - 1 || y >= height - 2) return;
    if (x === cx) return;
    set(x, y, "building");
  };

  switch (venue.category) {
    case "BAR":
    case "RESTAURANT":
      for (let x = 2; x < width - 2; x++) furnish(x, 2); // a counter
      break;
    case "GROCERY":
    case "SPAETI":
      for (let x = 2; x < width - 2; x += 2)
        for (let y = 2; y < height - 3; y++) furnish(x, y); // shelf aisles
      break;
    case "CLOTHING":
    case "SPORT":
    case "ARMOURY":
      for (let i = 0; i < 6; i++) {
        const x = 2 + ((rnd >> (i * 3)) % (width - 4));
        const y = 2 + ((rnd >> (i * 3 + 1)) % (height - 4));
        furnish(x, y); // scattered racks
      }
      break;
    case "NIGHTCLUB":
      furnish(3, 3);
      furnish(width - 4, 3);
      furnish(3, height - 4);
      furnish(width - 4, height - 4); // pillars around an open floor
      break;
  }

  // A service counter at the back-centre; the keeper (placed by enterInterior)
  // stands on the floor tile just behind it at (cx, 1).
  set(cx, 2, "building");

  return { id: `interior:${venue.id}`, width, height, tiles };
}

/** Where the keeper stands in an interior built by `buildInterior`. */
export function keeperSpot(map: GameMap): { x: number; y: number } {
  return { x: Math.floor(map.width / 2), y: 1 };
}

/** The trade-specific keeper sprite for a venue category (see renderer SPRITES).
 *  Mirrors the persona roles in `systems/npc.ts`. */
export function keeperSprite(category: string): string {
  switch (category) {
    case "BAR":
      return "bartender";
    case "RESTAURANT":
      return "cook";
    case "SPAETI":
      return "spaeti";
    case "CLOTHING":
      return "clerk";
    case "SPORT":
      return "trainer";
    case "ARMOURY":
      return "smith";
    default: // GROCERY, LANDMARK, OTHER, …
      return "keeper";
  }
}

// Trades whose sprite already carries identifying headwear (toque, bandana,
// headband, beanie) — they keep their look instead of a random hat.
const SIGNATURE_HEADWEAR = new Set(["RESTAURANT", "ARMOURY", "SPORT", "SPAETI"]);
// Hat/hair overlays for plain-haired trades; "" leaves the base hair showing.
const KEEPER_HEADWEAR = ["flatcap", "cap", "headscarf", "hair_blonde", "hair_grey", ""];

/** A deterministic hat/hair overlay (see renderer SPRITES) so two keepers of the
 *  same trade don't look identical. Keyed off the venue id, like the persona
 *  name in `systems/npc.ts`. Signature-headwear trades get no overlay. */
export function keeperOverlay(category: string, id: string): string | undefined {
  if (SIGNATURE_HEADWEAR.has(category)) return undefined;
  return KEEPER_HEADWEAR[hash(id) % KEEPER_HEADWEAR.length] || undefined;
}

/** A single dark maze level for a night club (Beads 58k.2). Reuses interior
 *  tiles; walls are "building", floor "plaza", door + boss marker are "venue". */
export function buildClubDungeon(venue: VenueInfo): {
  map: GameMap;
  spawn: { x: number; y: number };
  doorAt: { x: number; y: number };
  bossAt: { x: number; y: number };
} {
  const width = 15;
  const height = 13;
  const tiles: Tile[] = new Array(width * height);
  const set = (x: number, y: number, kind: TileKind) => {
    tiles[y * width + x] = { kind };
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const border = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      set(x, y, border ? "building" : "plaza");
    }
  }
  const cx = Math.floor(width / 2);
  const doorAt = { x: cx, y: height - 1 };
  const bossAt = { x: cx, y: 2 };
  set(doorAt.x, doorAt.y, "venue"); // exit
  set(bossAt.x, bossAt.y, "venue"); // boss marker

  // Scatter walls, keeping the central column (spawn -> boss) and the door/boss
  // rows clear so the level is always traversable.
  const rnd = hash(venue.id);
  for (let i = 0; i < 10; i++) {
    const x = 2 + ((rnd >> (i * 3)) % (width - 4));
    const y = 3 + ((rnd >> (i * 3 + 1)) % (height - 6));
    if (x === cx || x <= 0 || y <= 1 || x >= width - 1 || y >= height - 2) continue;
    set(x, y, "building");
  }

  return {
    map: { id: `club:${venue.id}`, width, height, tiles },
    spawn: { x: cx, y: height - 2 },
    doorAt,
    bossAt,
  };
}

export function enterInterior(state: GameState, venue: VenueInfo): GameState {
  const returnTo = {
    map: state.currentMap,
    position: { ...state.party.position },
    mode: state.mode,
  };
  // The venue's district lives on the overworld tile the party is standing on.
  const district = tileAt(state.currentMap, state.party.position)?.district;

  if (venue.category === "NIGHTCLUB") {
    const d = buildClubDungeon(venue);
    return {
      ...state,
      mode: "interior",
      currentMap: d.map,
      party: { ...state.party, position: { ...d.spawn }, facing: "north" },
      locationName: venue.name,
      locationCategory: venue.category,
      locationDistrict: district,
      locationCuisine: venue.cuisine,
      locationPrice: venue.priceLevel,
      locationEats: venue.eats,
      returnTo,
      dungeon: { doorAt: d.doorAt, bossAt: d.bossAt, cleared: false },
      keeper: undefined, // a dungeon, not a shop
      log: [
        ...state.log,
        `You slip past the door into ${venue.name}. It's dark, and something moves.`,
      ].slice(-8),
    };
  }

  const map = buildInterior(venue);
  const cx = Math.floor(map.width / 2);
  return {
    ...state,
    mode: "interior",
    currentMap: map,
    party: { ...state.party, position: { x: cx, y: map.height - 2 }, facing: "north" },
    locationName: venue.name,
    locationCategory: venue.category,
    locationDistrict: district,
    locationCuisine: venue.cuisine,
    locationPrice: venue.priceLevel,
    locationEats: venue.eats,
    returnTo,
    dungeon: undefined,
    keeper: {
      ...keeperSpot(map),
      sprite: keeperSprite(venue.category),
      overlay: keeperOverlay(venue.category, venue.id),
    },
    log: [...state.log, `You enter ${venue.name}.`].slice(-8),
  };
}

/** Boss defeated: mark the dungeon cleared and drop loot. */
export function clearDungeon(state: GameState): GameState {
  if (!state.dungeon) return state;
  const loot: InventoryItem = {
    name: "Neon Blade",
    kind: "weapon",
    value: 120,
    qty: 1,
    attack: 12,
  };
  const inv = [...state.party.inventory];
  const i = inv.findIndex((it) => it.name === loot.name);
  if (i === -1) inv.push(loot);
  else inv[i] = { ...inv[i], qty: inv[i].qty + 1 };
  return {
    ...state,
    dungeon: { ...state.dungeon, cleared: true },
    party: { ...state.party, inventory: inv },
    log: [
      ...state.log,
      "You beat the Techno Titan! It drops a Neon Blade.",
    ].slice(-8),
  };
}

export function exitInterior(state: GameState): GameState {
  if (!state.returnTo) return state;
  const { map, position, mode } = state.returnTo;
  return {
    ...state,
    mode,
    currentMap: map,
    party: { ...state.party, position: { ...position }, facing: "south" },
    locationName: undefined,
    locationCategory: undefined,
    locationDistrict: undefined,
    locationCuisine: undefined,
    locationPrice: undefined,
    locationEats: undefined,
    returnTo: undefined,
    dungeon: undefined,
    keeper: undefined,
    log: [...state.log, "You step back outside."].slice(-8),
  };
}
