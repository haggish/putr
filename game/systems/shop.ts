// Shop scaffold (Bead dyz.3). Pure buy/sell over the party's purse + pack. No
// real economy yet: buying deducts gold and adds a stack; selling returns half.
// Item effects (healing, equipping) arrive with the RPG/combat beads.

import type { GameState, InventoryItem } from "../types";

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  kind: "weapon" | "armor" | "consumable" | "misc";
  attack?: number;
  defense?: number;
}

// Keyed by venue LocationCategory. Nightclubs sell nothing (on hold).
const CATALOGS: Record<string, ShopItem[]> = {
  GROCERY: [
    { id: "bread", name: "Bread", price: 3, kind: "consumable" },
    { id: "sausage", name: "Sausage", price: 5, kind: "consumable" },
    { id: "rations", name: "Ration Pack", price: 8, kind: "consumable" },
  ],
  SPAETI: [
    { id: "mate", name: "Mate Soda", price: 2, kind: "consumable" },
    { id: "lager", name: "Lager Bottle", price: 3, kind: "consumable" },
    { id: "noodles", name: "Instant Noodles", price: 3, kind: "consumable" },
  ],
  CLOTHING: [
    { id: "tunic", name: "Cloth Tunic", price: 15, kind: "armor", defense: 2 },
    { id: "jacket", name: "Leather Jacket", price: 40, kind: "armor", defense: 4 },
    { id: "coat", name: "Winter Coat", price: 60, kind: "armor", defense: 6 },
  ],
  SPORT: [
    { id: "arrows", name: "Quiver of Arrows", price: 10, kind: "misc" },
    { id: "bow", name: "Sport Bow", price: 45, kind: "weapon", attack: 6 },
    { id: "trainers", name: "Trainers", price: 25, kind: "misc" },
  ],
  ARMOURY: [
    { id: "dagger", name: "Dagger", price: 20, kind: "weapon", attack: 4 },
    { id: "sword", name: "Short Sword", price: 55, kind: "weapon", attack: 8 },
    { id: "vest", name: "Chain Vest", price: 90, kind: "armor", defense: 8 },
  ],
  BAR: [
    { id: "pint", name: "Pint of Lager", price: 3, kind: "consumable" },
    { id: "schnapps", name: "Schnapps", price: 4, kind: "consumable" },
    { id: "meal", name: "Hearty Meal", price: 8, kind: "consumable" },
  ],
  RESTAURANT: [
    { id: "currywurst", name: "Currywurst", price: 6, kind: "consumable" },
    { id: "doner", name: "Doner", price: 5, kind: "consumable" },
    { id: "schnitzel", name: "Schnitzel", price: 10, kind: "consumable" },
  ],
};

export function shopCatalogFor(category?: string): ShopItem[] {
  return category ? (CATALOGS[category] ?? []) : [];
}

export interface ShopResult {
  state: GameState;
  ok: boolean;
  message: string;
}

function addToPack(
  pack: InventoryItem[],
  entry: InventoryItem,
): InventoryItem[] {
  const i = pack.findIndex((it) => it.name === entry.name);
  if (i === -1) return [...pack, entry];
  const next = [...pack];
  next[i] = { ...next[i], qty: next[i].qty + entry.qty };
  return next;
}

export function buyItem(state: GameState, item: ShopItem): ShopResult {
  if (state.party.gold < item.price) {
    return { state, ok: false, message: `Not enough gold for ${item.name}.` };
  }
  const party = {
    ...state.party,
    gold: state.party.gold - item.price,
    inventory: addToPack(state.party.inventory, {
      name: item.name,
      kind: item.kind,
      value: item.price,
      qty: 1,
      attack: item.attack,
      defense: item.defense,
    }),
  };
  const message = `Bought ${item.name} for ${item.price}g.`;
  return { state: { ...state, party, log: [...state.log, message].slice(-8) }, ok: true, message };
}

export function sellItem(state: GameState, index: number): ShopResult {
  const item = state.party.inventory[index];
  if (!item) return { state, ok: false, message: "" };
  const refund = Math.floor(item.value / 2);
  const inventory = [...state.party.inventory];
  if (item.qty > 1) inventory[index] = { ...item, qty: item.qty - 1 };
  else inventory.splice(index, 1);
  const party = { ...state.party, gold: state.party.gold + refund, inventory };
  const message = `Sold ${item.name} for ${refund}g.`;
  return { state: { ...state, party, log: [...state.log, message].slice(-8) }, ok: true, message };
}
