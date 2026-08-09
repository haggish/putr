"use server";

// Save/load the party to Postgres (Beads ua1.7 + 44n.2). Player-aware: a
// signed-in NextAuth user (by email) gets their own per-world save; when auth is
// dormant (the default here) everything falls back to a shared "local" player.
// One Party per (player, world) via the composite unique key; a PlayerSession
// row records presence for a future realtime layer. Follows the /notes pattern.

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import type { Character, InventoryItem } from "@/game";

export interface SaveSnapshot {
  x: number;
  y: number;
  facing: string;
  gold: number;
  members: Character[];
  inventory: InventoryItem[];
  /** Base64 bit-packed fog-of-war exploration grid (see app/play/explored.ts). */
  explored?: string;
}

const WORLD_SLUG = "berlin-ring";

/** Signed-in NextAuth user (by email) if present, else the shared local slot. */
async function resolvePlayer(): Promise<{ id: string; name: string }> {
  try {
    const session = await auth();
    const email = session?.user?.email;
    if (email) {
      const p = await prisma.player.upsert({
        where: { email },
        update: {
          name: session.user?.name ?? undefined,
          image: session.user?.image ?? undefined,
        },
        create: {
          email,
          name: session.user?.name ?? undefined,
          image: session.user?.image ?? undefined,
        },
      });
      return { id: p.id, name: p.name ?? "Adventurer" };
    }
  } catch {
    // Auth not configured — fall through to the local slot.
  }
  const local = await prisma.player.upsert({
    where: { id: "local" },
    update: {},
    create: { id: "local", name: "Local Player" },
  });
  return { id: local.id, name: local.name ?? "Local Player" };
}

export async function saveParty(
  snap: SaveSnapshot,
): Promise<{ ok: boolean; error?: string }> {
  const world = await prisma.world.findUnique({ where: { slug: WORLD_SLUG } });
  if (!world) {
    return { ok: false, error: "World not seeded — run npm run db:seed:world." };
  }
  const player = await resolvePlayer();
  const flags = JSON.parse(
    JSON.stringify({
      members: snap.members,
      inventory: snap.inventory,
      explored: snap.explored,
    }),
  );
  const fields = {
    tileX: snap.x,
    tileY: snap.y,
    facing: snap.facing,
    gold: snap.gold,
    flags,
  };
  await prisma.party.upsert({
    where: { playerId_worldId: { playerId: player.id, worldId: world.id } },
    update: fields,
    create: {
      worldId: world.id,
      playerId: player.id,
      name: player.name,
      ...fields,
    },
  });
  // Presence — a realtime layer renders other parties from PlayerSession rows.
  await prisma.playerSession.upsert({
    where: { playerId_worldId: { playerId: player.id, worldId: world.id } },
    update: { tileX: snap.x, tileY: snap.y, lastSeenAt: new Date() },
    create: {
      playerId: player.id,
      worldId: world.id,
      tileX: snap.x,
      tileY: snap.y,
    },
  });
  return { ok: true };
}

export async function loadParty(): Promise<SaveSnapshot | null> {
  const world = await prisma.world.findUnique({ where: { slug: WORLD_SLUG } });
  if (!world) return null;
  const player = await resolvePlayer();
  const p = await prisma.party.findUnique({
    where: { playerId_worldId: { playerId: player.id, worldId: world.id } },
  });
  if (!p) return null;
  const flags = (p.flags ?? {}) as {
    members?: Character[];
    inventory?: InventoryItem[];
    explored?: string;
  };
  return {
    x: p.tileX,
    y: p.tileY,
    facing: p.facing,
    gold: p.gold,
    members: flags.members ?? [],
    inventory: flags.inventory ?? [],
    explored: flags.explored,
  };
}
