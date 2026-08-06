import { describe, it, expect } from "vitest";
import { CLASSES, makeCharacter, RACES } from "@/game";

describe("character creation", () => {
  it("builds a level-1 character with class HP and the given stats", () => {
    const c = makeCharacter({
      name: "Test",
      race: "ELF",
      class: "WIZARD",
      stats: { str: 8, dex: 10, int: 16, wis: 9 },
    });
    expect(c.level).toBe(1);
    expect(c.xp).toBe(0);
    expect(c.maxHp).toBe(18); // wizard base HP
    expect(c.hp).toBe(c.maxHp);
    expect(c.stats.int).toBe(16);
    expect(c.race).toBe("ELF");
    expect(c.equipment).toEqual({});
  });

  it("defaults a blank name", () => {
    const c = makeCharacter({
      name: "   ",
      race: "HUMAN",
      class: "FIGHTER",
      stats: { str: 8, dex: 8, int: 8, wis: 8 },
    });
    expect(c.name).toBe("Adventurer");
  });

  it("exposes race and class option lists", () => {
    expect(RACES).toContain("HUMAN");
    expect(CLASSES).toContain("FIGHTER");
    expect(CLASSES.length).toBe(8);
  });
});
