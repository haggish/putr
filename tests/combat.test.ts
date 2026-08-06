import { describe, it, expect } from "vitest";
import {
  combatAct,
  createInitialState,
  fleeCombat,
  resolveCombat,
  startCombat,
  type Combatant,
  type GameState,
} from "@/game";

function withCombat(combatants: Combatant[], activeId: string): GameState {
  const base = createInitialState();
  return {
    ...base,
    mode: "combat",
    returnTo: {
      map: base.currentMap,
      position: { ...base.party.position },
      mode: "overworld",
    },
    combat: { combatants, activeId, log: [] },
  };
}

describe("combat", () => {
  it("starts with the whole party and the monsters", () => {
    const s = startCombat(createInitialState(), [
      { name: "Drug Addict", hp: 8, atk: 3, def: 0, reward: 4 },
    ]);
    expect(s.mode).toBe("combat");
    expect(s.combat?.combatants.filter((c) => c.side === "party").length).toBe(4);
    expect(s.combat?.combatants.filter((c) => c.side === "monster").length).toBe(1);
    expect(s.combat?.activeId).toBe("p0");
  });

  it("attacking an adjacent foe kills it, wins, and loots its reward", () => {
    const s = withCombat(
      [
        { id: "p0", name: "Ragna", side: "party", x: 5, y: 5, hp: 30, maxHp: 30, atk: 5, def: 1, memberIndex: 0 },
        { id: "m0", name: "Weakling", side: "monster", x: 5, y: 4, hp: 1, maxHp: 1, atk: 2, def: 0, reward: 5 },
      ],
      "p0",
    );
    const after = combatAct(s, "north"); // p0 strikes m0 above it
    expect(after.combat?.outcome).toBe("won");

    const resolved = resolveCombat(after);
    expect(resolved.mode).toBe("overworld");
    expect(resolved.party.gold).toBe(createInitialState().party.gold + 5);
    expect(resolved.combat).toBeUndefined();
  });

  it("monsters strike back once the party has acted", () => {
    const s = withCombat(
      [
        { id: "p0", name: "Ragna", side: "party", x: 5, y: 5, hp: 20, maxHp: 20, atk: 5, def: 0, memberIndex: 0 },
        { id: "m0", name: "Boar", side: "monster", x: 5, y: 3, hp: 30, maxHp: 30, atk: 6, def: 0, reward: 0 },
      ],
      "p0",
    );
    const after = combatAct(s, "north"); // p0 steps to (5,4), then the boar attacks
    const p0 = after.combat?.combatants.find((c) => c.id === "p0");
    expect(p0?.hp).toBe(14); // 20 - max(1, 6-0)
  });

  it("fleeing returns to the overworld", () => {
    const s = startCombat(createInitialState(), [
      { name: "Wild Boar", hp: 18, atk: 5, def: 2, reward: 6 },
    ]);
    const out = resolveCombat(fleeCombat(s));
    expect(out.mode).toBe("overworld");
    expect(out.combat).toBeUndefined();
  });
});
