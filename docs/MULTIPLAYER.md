# Multiplayer — approach (Bead 44n.1)

Schema-only preparation. This documents how the data model supports multiple
players sharing one world, and what a later realtime layer would add. No
realtime code ships yet.

## Model

- **World** — the shared space (Berlin inside the Ring). One canonical world
  (`slug: "berlin-ring"`); the schema allows more (shards, seasonal maps).
- **Player** — an account. Linked to a **NextAuth** identity by `email`
  (GitHub etc.); `image`/`name` mirror the provider. A single `id: "local"`
  Player is the fallback slot when auth is dormant (the default in this repo).
- **Party** — a player's adventuring group *and* their save game (position,
  gold, roster in `flags`). **`@@unique([playerId, worldId])`** — one save per
  player per world is the ownership key.
- **PlayerSession** — presence: which player is in which world, their party, and
  their last-known `mapId`/`tileX`/`tileY` + `lastSeenAt`. One per
  `(playerId, worldId)`. A realtime layer renders other parties from these rows.

## Identity flow

`app/play/actions.ts` resolves the current player on every save/load:

1. `await auth()` → if a signed-in user with an email exists, upsert a Player by
   that email and use it.
2. Otherwise (auth not configured / not signed in) fall back to the shared
   `"local"` Player.

So the game is fully playable single-player today; turning on NextAuth
(`AUTH_SECRET` + provider creds) automatically gives each signed-in user their
own per-world save with **no code change** — that's the point of this prep.

## What realtime would add later (not in scope)

- A transport (WebSocket / SSE / a Postgres `LISTEN/NOTIFY` or a service like
  Pusher) to broadcast party movement.
- Writing `PlayerSession` position on move (not just on save) and subscribing to
  other sessions in the same world to render their parties on the overworld.
- Conflict rules for shared interiors/combat (instancing vs shared).

None of that changes the tables above — it reads/writes the presence fields
already in place.
