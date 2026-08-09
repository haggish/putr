import { describe, it, expect } from "vitest";
import {
  buyItem,
  createInitialState,
  menuFor,
  sellItem,
  shopCatalogFor,
} from "@/game";

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

describe("menuFor", () => {
  it("builds a restaurant menu from real dishes, priced by level", () => {
    const menu = menuFor({
      locationCategory: "RESTAURANT",
      locationEats: ["Tom Yum Soup", "Boat Noodles", "Pad Thai"],
      locationPrice: 2, // band 7..12
    });
    expect(menu.map((i) => i.name)).toEqual([
      "Tom Yum Soup",
      "Boat Noodles",
      "Pad Thai",
    ]);
    expect(menu[0].price).toBe(7); // band low
    expect(menu[2].price).toBe(12); // band high
    expect(menu[1].price).toBeGreaterThan(menu[0].price); // spread within the band
    // A pricier restaurant charges more for the same-position dish.
    const posh = menuFor({
      locationCategory: "RESTAURANT",
      locationEats: ["Amuse", "Main"],
      locationPrice: 5,
    });
    expect(posh[0].price).toBeGreaterThan(menu[0].price);
  });

  it("gives a restaurant with no dish data no menu", () => {
    expect(menuFor({ locationCategory: "RESTAURANT" })).toEqual([]);
  });

  it("falls back to the category catalog for non-restaurants", () => {
    expect(menuFor({ locationCategory: "ARMOURY" })).toEqual(
      shopCatalogFor("ARMOURY"),
    );
  });
});
