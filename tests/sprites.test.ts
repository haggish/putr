import { describe, it, expect } from "vitest";
import {
  clubBoss,
  createInitialState,
  heroSprite,
  SPRITES,
  startCombat,
} from "@/game";

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

  it("has a sprite per class and party members combat as their class", () => {
    for (const key of ["fighter", "cleric", "wizard", "rogue", "paladin", "ranger", "barbarian", "druid"]) {
      expect(SPRITES[key]).toBeTruthy();
    }
    const party = createInitialState().party.members;
    expect(heroSprite(party[0])).toBe("fighter"); // Ragna
    expect(heroSprite(party[2])).toBe("wizard"); // Sela

    const s = startCombat(createInitialState(), [clubBoss()]);
    const p0 = s.combat!.combatants.find(
      (c) => c.side === "party" && c.memberIndex === 0,
    );
    expect(p0?.sprite).toBe("fighter");
  });
});
