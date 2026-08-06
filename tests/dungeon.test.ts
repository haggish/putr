import { describe, it, expect } from "vitest";
import {
  buildClubDungeon,
  clearDungeon,
  clubBoss,
  createInitialState,
  enterInterior,
  exitInterior,
  isPassable,
  resolveCombat,
  startCombat,
  tileAt,
  type VenueInfo,
} from "@/game";

const club: VenueInfo = {
  id: "node/9",
  name: "Berghain",
  category: "NIGHTCLUB",
  x: 10,
  y: 10,
};

describe("night-club dungeon", () => {
  it("builds a dungeon with a reachable door, boss marker, and walkable spawn", () => {
    const d = buildClubDungeon(club);
    expect(tileAt(d.map, d.doorAt)!.kind).toBe("venue");
    expect(tileAt(d.map, d.bossAt)!.kind).toBe("venue");
    expect(isPassable(d.map, d.spawn)).toBe(true);
    // The central column stays open from spawn up to the boss.
    for (let y = d.bossAt.y; y <= d.spawn.y; y++) {
      expect(isPassable(d.map, { x: d.spawn.x, y })).toBe(true);
    }
  });

  it("entering a nightclub yields a dungeon; exiting clears the flag", () => {
    const base = createInitialState();
    base.party.position = { x: 10, y: 10 };
    const inside = enterInterior(base, club);
    expect(inside.mode).toBe("interior");
    expect(inside.currentMap.id).toBe("club:node/9");
    expect(inside.dungeon?.cleared).toBe(false);
    const outside = exitInterior(inside);
    expect(outside.dungeon).toBeUndefined();
    expect(outside.party.position).toEqual({ x: 10, y: 10 });
  });

  it("clearing the dungeon drops a Neon Blade", () => {
    const cleared = clearDungeon(enterInterior(createInitialState(), club));
    expect(cleared.dungeon?.cleared).toBe(true);
    expect(
      cleared.party.inventory.find((i) => i.name === "Neon Blade")?.attack,
    ).toBe(12);
  });

  it("a fight inside the dungeon returns to the dungeon, not the overworld", () => {
    const inside = enterInterior(createInitialState(), club);
    const fighting = startCombat(inside, [clubBoss()]);
    expect(fighting.mode).toBe("combat");
    expect(fighting.combat?.return?.mode).toBe("interior");

    const won = {
      ...fighting,
      combat: {
        ...fighting.combat!,
        outcome: "won" as const,
        combatants: fighting.combat!.combatants.map((c) =>
          c.side === "monster" ? { ...c, hp: 0 } : c,
        ),
      },
    };
    const after = resolveCombat(won);
    expect(after.mode).toBe("interior");
    expect(after.currentMap.id).toBe("club:node/9");
    expect(after.returnTo).toBeDefined(); // interior's overworld-return survives
  });
});
