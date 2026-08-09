import { describe, it, expect } from "vitest";
import {
  buyItem,
  characterAttack,
  consume,
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

  it("eats a consumable to heal (scaled by price/3), capped at maxHp", () => {
    const s = createInitialState();
    s.party.members[0].hp = 10; // Ragna maxHp 30
    s.party.inventory = [
      { name: "Ration Pack", kind: "consumable", value: 8, qty: 2 },
      { name: "Feast", kind: "consumable", value: 95, qty: 1 },
    ];

    const r = consume(s, 0, 0); // round(8/3) = 3 HP, stack decrements
    expect(r.ok).toBe(true);
    expect(r.state.party.members[0].hp).toBe(13);
    expect(r.state.party.inventory[0].qty).toBe(1);
    expect(r.state.log.at(-1)).toContain("+3 HP");

    // A 95-value feast (round(95/3)=32) only heals up to maxHp (30).
    const r2 = consume(r.state, 0, 1);
    expect(r2.state.party.members[0].hp).toBe(30);
    expect(r2.state.party.inventory.find((i) => i.name === "Feast")).toBeUndefined();
  });

  it("won't eat gear, and won't waste food on a full-HP hero", () => {
    const s = createInitialState();
    s.party.inventory = [{ name: "Dagger", kind: "weapon", value: 20, qty: 1, attack: 4 }];
    expect(consume(s, 0, 0).ok).toBe(false); // gear isn't edible

    const full = createInitialState();
    full.party.inventory = [{ name: "Bread", kind: "consumable", value: 3, qty: 1 }];
    const r = consume(full, 0, 0); // hero already at full HP
    expect(r.ok).toBe(false);
    expect(r.state.party.inventory[0].qty).toBe(1); // not consumed
  });
});
