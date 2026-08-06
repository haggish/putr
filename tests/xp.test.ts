import { describe, it, expect } from "vitest";
import {
  createInitialState,
  grantXp,
  resolveCombat,
  xpForNextLevel,
  createDefaultParty,
} from "@/game";

describe("xp & leveling", () => {
  it("accumulates xp without leveling below the threshold", () => {
    const { members, ups } = grantXp(createDefaultParty(), 50);
    expect(members[0].xp).toBe(50);
    expect(members[0].level).toBe(1);
    expect(ups).toHaveLength(0);
  });

  it("levels up at the threshold: +maxHP, +primary stat, full heal", () => {
    const before = createDefaultParty()[0]; // Ragna, FIGHTER, maxHp 30, str 15
    const { members, ups } = grantXp(createDefaultParty(), xpForNextLevel(1));
    const r = members[0];
    expect(r.level).toBe(2);
    expect(r.maxHp).toBe(before.maxHp + 6);
    expect(r.hp).toBe(r.maxHp);
    expect(r.stats.str).toBe(before.stats.str + 1); // fighter's primary
    expect(r.xp).toBe(0);
    expect(ups).toContain("Ragna reaches level 2!");
  });

  it("does not grant xp to downed members", () => {
    const party = createDefaultParty();
    party[1] = { ...party[1], hp: 0 };
    const { members } = grantXp(party, 100);
    expect(members[1].xp).toBe(0);
    expect(members[1].level).toBe(1);
  });

  it("combat victory grants xp + gold through resolveCombat", () => {
    const base = createInitialState();
    const state = {
      ...base,
      mode: "combat" as const,
      returnTo: {
        map: base.currentMap,
        position: { ...base.party.position },
        mode: "overworld" as const,
      },
      combat: {
        combatants: [
          { id: "p0", name: "Ragna", side: "party" as const, x: 5, y: 5, hp: 30, maxHp: 30, atk: 5, def: 1, memberIndex: 0 },
          { id: "m0", name: "Weak", side: "monster" as const, x: 5, y: 4, hp: 0, maxHp: 8, atk: 1, def: 0, reward: 4, xpReward: 100 },
        ],
        outcome: "won" as const,
        log: [],
      },
    };
    const out = resolveCombat(state);
    expect(out.mode).toBe("overworld");
    expect(out.party.gold).toBe(base.party.gold + 4);
    expect(out.party.members[0].level).toBe(2); // 100 XP -> level 2
  });
});
