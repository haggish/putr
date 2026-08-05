// Map queries and passability. Pure functions over GameMap — unit-testable,
// no DOM. Shared by the overworld and every interior/dungeon sub-map.

import type { GameMap, Tile, TileKind, Vec2 } from "./types";

const IMPASSABLE: ReadonlySet<TileKind> = new Set<TileKind>([
  "water",
  "building",
  "rail",
]);

export function inBounds(map: GameMap, p: Vec2): boolean {
  return p.x >= 0 && p.y >= 0 && p.x < map.width && p.y < map.height;
}

export function tileAt(map: GameMap, p: Vec2): Tile | undefined {
  if (!inBounds(map, p)) return undefined;
  return map.tiles[p.y * map.width + p.x];
}

export function isPassable(map: GameMap, p: Vec2): boolean {
  const t = tileAt(map, p);
  return t !== undefined && !IMPASSABLE.has(t.kind);
}
