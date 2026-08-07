import { describe, it, expect } from "vitest";
import { clubBoss, createInitialState, SPRITES, startCombat } from "@/game";

describe("monster sprites", () => {
  it("every roster sprite key exists in SPRITES", () => {
    for (const key of ["addict", "thief", "boar", "wraith", "troll", "specter", "titan"]) {
      expect(SPRITES[key]).toBeTruthy();
    }
  });

  it("startCombat propagates a monster's sprite to its combatant", () => {
    const s = startCombat(createInitialState(), [clubBoss()]);
    const boss = s.combat!.combatants.find((c) => c.side === "monster");
    expect(boss?.sprite).toBe("titan");
  });
});
