# Penultimate I — The Ring · Game Engine Architecture

> Design note for Beads `pu-nwe.1` (rendering & game-loop
> architecture) and the scaffold in `nwe.2`. An Ultima III-like, tile-based,
> keyboard-driven action-adventure set inside Berlin's S-Bahn Ring.

## Decision: Canvas 2D tile engine with a pure core

- **Rendering:** HTML5 **Canvas 2D**, a fixed tile grid drawn through an **~11×11
  viewport** (odd → party centered), **32 px** tiles. This matches the Ultima III
  / Amiga feel (see the layout benchmark noted in `docs/ATTRIBUTION.md`) and is
  the cheapest path to a crisp pixel-art look. WebGL is unnecessary at this scale
  (a 256×256 overworld is tiny data; only the ~121 visible tiles draw per frame).
- **Movement model:** **discrete, event-driven grid steps** (keydown → step →
  render), not a continuously-simulated world. A turn-based Ultima-like doesn't
  need a real-time `requestAnimationFrame` loop yet; one can be added later purely
  for animation (sprite cycling, combat) without changing the core.

## Layering (why the code is split this way)

```
game/
  types.ts                 pure data: Vec2, Direction, Tile, GameMap, GameState
  world.ts                 pure: inBounds / tileAt / isPassable
  state.ts                 pure: createInitialState + placeholderMap
  input.ts                 pure: keyToDirection (arrows + WASD)
  systems/movement.ts      pure: step(state, dir) -> { state, moved }
  renderer/canvasRenderer  browser adapter: draws GameState to a 2D context
  controller.ts            browser adapter: owns state, wires keys -> steps -> render
  index.ts                 public barrel ("@/game")
```

- **Pure core** (`types`, `world`, `state`, `input`, `systems/*`) has **no DOM and
  no Prisma import**, so it is safe in Server Components and fully unit-testable
  under Vitest (the engine-tests bead targets exactly these). Every state
  transition is a pure function returning a new `GameState`.
- **Browser adapters** (`renderer`, `controller`) are the only pieces that touch
  the canvas / `window`. They live behind the `/play` client component.

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
