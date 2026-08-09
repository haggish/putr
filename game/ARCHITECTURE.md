# Penultimate I — The Ring · Game Engine Architecture

> Design note for Beads `pu-nwe.1` (rendering & game-loop
> architecture) and the scaffold in `nwe.2`. An Ultima III-like, tile-based,
> keyboard-driven action-adventure set inside Berlin's S-Bahn Ring.

## Decision: Canvas 2D tile engine with a pure core

- **Rendering:** HTML5 **Canvas 2D**, a fixed tile grid drawn through an **~11×11
  viewport** (odd → party centered), **32 px** tiles. This matches the Ultima III
  / Amiga feel (see the layout benchmark noted in `docs/ATTRIBUTION.md`) and is
  the cheapest path to a crisp pixel-art look. WebGL is unnecessary at this scale
  (the 324×229 overworld is tiny data; only the ~121 visible tiles draw per frame).
- **Movement model:** **discrete, event-driven grid steps** (keydown → step →
  render), not a continuously-simulated world. The pure core stays turn-based;
  a client-side `requestAnimationFrame` loop was later added **only in the
  browser adapter** (`/play`) to drive combat animations and timing — the engine's
  state transitions remain pure and synchronous.

## Layering (why the code is split this way)

```
game/
  types.ts                 pure data: Vec2, Direction, Tile, GameMap, GameState
  world.ts                 pure: inBounds / tileAt / isPassable
  state.ts                 pure: createInitialState + placeholderMap
  input.ts                 pure: keyToDirection (arrows + WASD)
  world-asset.ts           pure: decode the OSM asset -> GameMap + venue/station info
  systems/movement.ts      pure: step(state, dir) -> { state, moved } (+ district msg)
  systems/interior.ts      pure: enter/exit venues, night-club dungeon, keeper
  systems/shop.ts          pure: catalogs + menuFor (restaurant dish menus), buy/sell
  systems/party.ts         pure: roster, equip, XP/leveling, class sprites
  systems/combat.ts        pure: tile-arena turn-based combat
  systems/monsters.ts      pure: encounter tables + the club boss
  systems/npc.ts           pure: keeper persona/system-prompt builder
  renderer/canvasRenderer  browser adapter: draws GameState (world/combat/map) to 2D
  renderer/tiles.ts        original pixel tiles, venue/landmark icons, sprites
  controller.ts            browser adapter: owns state, wires keys -> steps -> render
  index.ts                 public barrel ("@/game")
```

- **Pure core** (`types`, `world`, `state`, `input`, `world-asset`, `systems/*`)
  has **no DOM and no Prisma import**, so it is safe in Server Components and fully
  unit-testable under Vitest. Every state transition is a pure function returning a
  new `GameState`.
- **Browser adapters** (`renderer`, `controller`) are the only engine pieces that
  touch the canvas / `window`. They live behind the `/play` client component.
  Other purely-client concerns — sound (`sfx.ts`), music (`music.ts`), the
  fog-of-war map overlay, and exploration (de)serialization (`explored.ts`) —
  live in `app/play/`, not in `game/`.

## How it fits the Next.js stack

Mirrors the `/notes` pattern (Server Component reads → Client Component for
interactivity → Server Actions for writes):

1. A Server Component / route loads the **world asset** (world-data epic) and any
   **save game** via Prisma, and passes a serializable `GameState` to the client.
2. The `/play` **client component** constructs a `CanvasRenderer` + `GameController`
   against its `<canvas>`, attaches a `keydown` listener, and renders.
3. **Save/load** is a Server Action that persists the serializable `GameState`
   (`revalidatePath`), exactly like the notes mutations.

`GameState` is intentionally **JSON-serializable** end to end so it crosses the
server/client boundary and the save-game table without translation.

## Extensibility hooks for the roadmap

- `GameMode = "overworld" | "interior" | "dungeon" | "combat"` — interiors, the
  night-club dungeon, and combat are **additional modes over the same map/render
  core**, not separate engines. `currentMap` is swapped when entering a venue.
- `Tile.district` is carried on every tile for **encounter tables, NPC flavor, and
  shop distribution** per district.
- `Tile.kind === "venue"` + `locationId` is the **enter-location** hook.
- `Party` is deliberately minimal here; the **character roster (race / stats / HP /
  gear)** attaches via the RPG bead without touching movement.
- Multiplayer becomes multiple parties/characters over one shared world map;
  ownership lives in the persistence layer, not the render core.

## Placeholder-first

`state.ts#placeholderMap()` lets the engine run and be walked **before** the OSM
world asset exists; the load-world bead replaces it. Renderer colors are flat
placeholders that the pixel-art tileset bead swaps for atlas sprites.
