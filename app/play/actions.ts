"use server";

// Save/load the party to Postgres (Bead ua1.7). Auth is dormant, so this uses a
// single local slot (one Party row for a "local" player). The rich runtime
// party (members, inventory) rides along in Party.flags JSON; position/gold live
// in real columns. Follows the /notes Server Action pattern.

import { prisma } from "@/lib/prisma";
import type { Character, InventoryItem } from "@/game";

export interface SaveSnapshot {
  x: number;
  y: number;
  facing: string;
  gold: number;
  members: Character[];
  inventory: InventoryItem[];
}

const WORLD_SLUG = "berlin-ring";
const PLAYER_ID = "local";
const SAVE_ID = "local-save";

export async function saveParty(
  snap: SaveSnapshot,
): Promise<{ ok: boolean; error?: string }> {
  const world = await prisma.world.findUnique({ where: { slug: WORLD_SLUG } });
  if (!world) {
    return { ok: false, error: "World not seeded — run npm run db:seed:world." };
  }
  await prisma.player.upsert({
    where: { id: PLAYER_ID },
    update: {},
    create: { id: PLAYER_ID, name: "Local Player" },
  });
  const flags = JSON.parse(
    JSON.stringify({ members: snap.members, inventory: snap.inventory }),
  );
  const fields = {
    tileX: snap.x,
    tileY: snap.y,
    facing: snap.facing,
    gold: snap.gold,
    flags,
  };
  await prisma.party.upsert({
    where: { id: SAVE_ID },
    update: fields,
    create: {
      id: SAVE_ID,
      worldId: world.id,
      playerId: PLAYER_ID,
      name: "Party",
      ...fields,
    },
  });
  return { ok: true };
}

export async function loadParty(): Promise<SaveSnapshot | null> {
  const p = await prisma.party.findUnique({ where: { id: SAVE_ID } });
  if (!p) return null;
  const flags = (p.flags ?? {}) as {
    members?: Character[];
    inventory?: InventoryItem[];
  };
  return {
    x: p.tileX,
    y: p.tileY,
    facing: p.facing,
    gold: p.gold,
    members: flags.members ?? [],
    inventory: flags.inventory ?? [],
  };
}
