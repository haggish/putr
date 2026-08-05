import { describe, it, expect } from "vitest";
import { buyItem, createInitialState, sellItem, shopCatalogFor } from "@/game";

const dagger = shopCatalogFor("ARMOURY").find((i) => i.id === "dagger")!; // 20g
const vest = shopCatalogFor("ARMOURY").find((i) => i.id === "vest")!; // 90g

describe("shop", () => {
  it("buys an item, deducting gold and adding to the pack", () => {
    const s = createInitialState();
    s.party.gold = 100;
    const r = buyItem(s, dagger);
    expect(r.ok).toBe(true);
    expect(r.state.party.gold).toBe(80);
    expect(r.state.party.inventory[0]).toMatchObject({ name: "Dagger", qty: 1 });
  });

  it("refuses a purchase when gold is short", () => {
    const s = createInitialState();
    s.party.gold = 5;
    const r = buyItem(s, vest);
    expect(r.ok).toBe(false);
    expect(r.state.party.gold).toBe(5);
    expect(r.state.party.inventory.length).toBe(0);
  });

  it("sells back for half and removes the stack", () => {
    const s = createInitialState();
    s.party.gold = 100;
    const bought = buyItem(s, dagger).state; // 80g, dagger x1
    const r = sellItem(bought, 0);
    expect(r.ok).toBe(true);
    expect(r.state.party.gold).toBe(90); // 80 + floor(20/2)
    expect(r.state.party.inventory.length).toBe(0);
  });
});
