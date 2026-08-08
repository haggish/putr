// Public surface of the game engine. Import from "@/game".

export * from "./types";
export * from "./world";
export * from "./state";
export * from "./input";
export * from "./world-asset";
export * from "./systems/movement";
export * from "./systems/interior";
export * from "./systems/shop";
export * from "./systems/party";
export * from "./systems/monsters";
export * from "./systems/combat";
export * from "./systems/npc";
export { CanvasRenderer, COMBAT_ANIM, TILE_COLORS } from "./renderer/canvasRenderer";
export type { CombatFx, RendererOptions } from "./renderer/canvasRenderer";
export {
  TILE_PATTERNS,
  SPRITES,
  VENUE_TILES,
  VENUE_LANDMARK_TILES,
  venueIconKey,
} from "./renderer/tiles";
export type { TilePattern } from "./renderer/tiles";
export { GameController } from "./controller";
