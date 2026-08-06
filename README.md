# Penultimate I — The Ring

An Ultima III-inspired, tile-based, keyboard-driven action-adventure set inside
the real city of **Berlin, bounded by the S-Bahn Ring (S41/S42)**. The overworld
is built from OpenStreetMap data; you explore actual streets, parks, the Spree,
and named districts, drop into bars/spätis/shops, ride the U-/S-Bahn, fight
encounters, level up, and raid night-club dungeons.

It's built on a boring, reliable Next.js full-stack (the original starter README
is preserved in the setup steps below): **Server Actions are the backend**, the
game engine is a pure, DOM-free TypeScript core with thin browser adapters, and
world/save data lives in Postgres via Prisma.

> Homage, not clone: game *mechanics* (tile movement, HP/armor, shops, dungeons)
> are reimplemented; all art is original and the world data is OpenStreetMap.
> See [`docs/ATTRIBUTION.md`](docs/ATTRIBUTION.md).

## What's in it

- **Real Berlin overworld** — a 324×229 tile map (~40 m/tile) inside the Ring,
  from OSM: water, parks, streets, 90 districts, 600 placed venues.
- **Party & RPG** — create a party (race/class/point-buy stats) or use the
  default four; HP, gear you buy and equip, XP and leveling.
- **Explore & interact** — enter venues into interior sub-maps; shop (buy/sell/
  equip); talk to AI-driven keepers (Claude API).
- **Combat** — ~10% random encounters on streets/parks → turn-based tile arena
  vs. drug addicts, thieves, wild boars, and exotic foes; loot + XP on victory.
- **Transit** — 121 U-/S-Bahn stations; stand on one to fast-travel.
- **Night-club dungeons** — a maze interior with a boss (the Techno Titan) and
  loot.
- **Save/resume** — persisted to Postgres; multiplayer-ready (auth-linked
  ownership, presence), realtime deferred.

| Layer        | Choice                                             |
| ------------ | -------------------------------------------------- |
| Framework    | **Next.js 16** (App Router) on **React 19**        |
| Language     | **TypeScript** (strict)                            |
| Game render  | **HTML5 Canvas 2D** + original pixel tiles         |
| Database     | **PostgreSQL 17** + **Prisma 7** (pg driver adapter) |
| Styling      | **Tailwind CSS v4**                                |
| AI NPCs      | **@anthropic-ai/sdk** (server-side, optional)      |
| Auth (opt.)  | **Auth.js / NextAuth v5** (disabled until you set it up) |
| Testing      | **Vitest**                                         |

---

## Quick start (WSL2 on Windows)

Keep the project on the Linux filesystem (e.g. `~/projects/...`, **not**
`/mnt/c/...`) for fast file watching and installs.

### 1. Node 22

```bash
nvm install    # picks up .nvmrc (22)
nvm use
node -v        # v22.x
```

### 2. Postgres

```bash
docker compose up -d      # Postgres 17 with the credentials the default .env expects
```

The `.env` connection string is:

```
postgresql://postgres:postgres@localhost:5432/app_dev?schema=public
```

### 3. Install, migrate, seed the world

```bash
npm install               # postinstall runs prisma generate
npm run db:migrate        # apply migrations (game domain model)
npm run db:seed:world     # seed World + 90 districts + 600 locations from the asset
```

The generated world asset is committed at
`public/world/berlin-overworld.json`, so **no network is needed to play**. To
regenerate it from scratch you'd run the pipeline in `world/build/` (which does
hit the OpenStreetMap Overpass API).

### 4. Play

```bash
npm run dev
```

Open **<http://localhost:3000/play>**. (Or `/play/create` to roll a custom
party.)

**Controls:** arrow keys / WASD to move · **Enter** on a gold venue to go
inside · **F** to flee combat · buttons in the side panel for shop, equip, talk,
travel, and save.

### 5. (Optional) Bring the AI NPCs to life

NPC dialogue calls the Claude API server-side. Without a key you get a graceful
placeholder line. To enable real replies, set in `.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

The key stays server-side (used only in `app/play/npc-actions.ts`). Model
defaults to `claude-opus-4-8`; swap `NPC_MODEL` to `claude-haiku-4-5` there for
a cheaper/faster keeper.

---

## How it's built

- **Engine** (`game/`) — a pure, DOM-free core (`types`, `world`, `state`,
  `input`, `systems/*` for movement/interiors/shop/party/combat/monsters/npc)
  that is fully unit-testable, plus browser adapters (`renderer/`, `controller`).
  See [`game/ARCHITECTURE.md`](game/ARCHITECTURE.md).
- **World pipeline** (`world/`) — projection + Overpass fetch/rasterize scripts
  that emit the static overworld asset; the engine loads it at runtime.
- **Next.js glue** — a Server Component/route loads the asset + save, a `/play`
  Client Component runs the canvas, and **Server Actions** (`app/play/*.ts`)
  handle save/load (Prisma) and NPC dialogue (Claude). Mirrors the `/notes` demo.
- **Persistence & multiplayer** — one `Party` (= save) per player per world;
  `PlayerSession` carries presence; identity links to NextAuth by email with a
  local fallback. See [`docs/MULTIPLAYER.md`](docs/MULTIPLAYER.md).

### Project layout

```
game/                 engine (pure core + canvas/controller adapters)
  ARCHITECTURE.md
world/
  lib/projection.mjs  lat/lon -> tile grid
  build/*.mjs         fetch (OSM/Overpass) + rasterize -> asset
public/world/berlin-overworld.json   committed overworld asset
app/play/
  page.tsx            /play route
  create/page.tsx     character creation
  game-canvas.tsx     client: canvas + HUD
  actions.ts          save/load (Server Actions)
  npc-actions.ts      AI NPC dialogue (Claude, server-side)
prisma/
  schema.prisma       World/District/Location/Player/Party/Character/... 
  seed-world.ts       world seed (npm run db:seed:world)
docs/                 ATTRIBUTION.md, MULTIPLAYER.md
tests/                Vitest (movement, interiors, shop, party, xp, combat,
                      transit, dungeon, tiles, npc, ...)
```

## Common commands

```bash
npm run dev            # dev server
npm run build          # prisma generate + production build
npm run test           # run all unit tests (Vitest)
npm run db:migrate     # create/apply a migration
npm run db:seed:world  # seed the game world (World/Districts/Locations)
npm run db:studio      # visual DB browser
```

---

## Data & licensing

- **World & venue data** © OpenStreetMap contributors, **ODbL**. The generated
  world asset is a derived database.
- **All art is original** (hand-authored pixel tiles); no Ultima/Origin/EA
  assets are used. "Ultima"/"Exodus" are referenced only nominatively.
- Transit data is currently OSM (ODbL); a VBB/BVG GTFS license TODO is tracked.

Full details and the asset registry: [`docs/ATTRIBUTION.md`](docs/ATTRIBUTION.md).

## Optional: Authentication (enables per-user saves)

Auth.js (NextAuth v5) is wired but inactive so the game runs immediately as a
single local player. Turn it on:

```bash
npx auth secret        # writes AUTH_SECRET into .env
```

Create a GitHub OAuth app (callback
`http://localhost:3000/api/auth/callback/github`) and set `AUTH_GITHUB_ID` /
`AUTH_GITHUB_SECRET`. Once signed in, each user automatically gets their own
per-world save — no code change (see `app/play/actions.ts` + `docs/MULTIPLAYER.md`).

## Deploying

`npm run build` produces a standard Next.js server for any Node 22 host behind
your own Postgres; set `DATABASE_URL` (and `ANTHROPIC_API_KEY` for live NPCs).
Note the world seed (`npm run db:seed:world`) must run once against the target DB.
