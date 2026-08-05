import { describe, it, expect } from "vitest";
import {
  buyItem,
  characterAttack,
  createInitialState,
  equip,
  shopCatalogFor,
  unequip,
} from "@/game";

const sword = shopCatalogFor("ARMOURY").find((i) => i.id === "sword")!; // ATK 8

describe("party", () => {
  it("starts with a default roster of four", () => {
    const s = createInitialState();
    expect(s.party.members.length).toBe(4);
    expect(s.party.members[0].name).toBe("Ragna");
  });

  it("equips a bought weapon (raising attack) and unequips it back to the pack", () => {
    let s = createInitialState();
    s.party.gold = 100;
    s = buyItem(s, sword).state;

    const before = characterAttack(s.party.members[0]);
    const eq = equip(s, 0, 0);
    expect(eq.ok).toBe(true);
    expect(eq.state.party.members[0].equipment.weapon?.name).toBe("Short Sword");
    expect(characterAttack(eq.state.party.members[0])).toBe(before + 8);
    expect(eq.state.party.inventory.length).toBe(0);

    const un = unequip(eq.state, 0, "weapon");
    expect(un.state.party.members[0].equipment.weapon).toBeUndefined();
    expect(characterAttack(un.state.party.members[0])).toBe(before);
    expect(un.state.party.inventory[0].name).toBe("Short Sword");
  });
});
