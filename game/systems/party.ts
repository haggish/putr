// Party & characters (Beads qb2.1 / qb2.2 / qb2.3). Pure: a default roster,
// derived combat stats, and equip/unequip that move gear between the shared
// pack and a member's slots. Item effects in combat arrive with the combat bead.

import type {
  Character,
  EquipSlot,
  GameState,
  InventoryItem,
} from "../types";

/** The default starting party (four classic archetypes). */
export function createDefaultParty(): Character[] {
  return [
    { name: "Ragna", race: "HUMAN", class: "FIGHTER", level: 1, hp: 30, maxHp: 30, stats: { str: 15, dex: 11, int: 8, wis: 9 }, equipment: {} },
    { name: "Bruno", race: "DWARF", class: "CLERIC", level: 1, hp: 24, maxHp: 24, stats: { str: 12, dex: 10, int: 10, wis: 14 }, equipment: {} },
    { name: "Sela", race: "ELF", class: "WIZARD", level: 1, hp: 18, maxHp: 18, stats: { str: 8, dex: 12, int: 15, wis: 11 }, equipment: {} },
    { name: "Pip", race: "HALFLING", class: "THIEF", level: 1, hp: 22, maxHp: 22, stats: { str: 9, dex: 15, int: 11, wis: 8 }, equipment: {} },
  ];
}

export function characterAttack(c: Character): number {
  return Math.floor(c.stats.str / 3) + (c.equipment.weapon?.attack ?? 0);
}

export function characterDefense(c: Character): number {
  return (
    Math.floor(c.stats.dex / 3) +
    (c.equipment.armor?.defense ?? 0) +
    (c.equipment.shield?.defense ?? 0)
  );
}

function kindToSlot(kind: string): EquipSlot | null {
  if (kind === "weapon" || kind === "armor" || kind === "shield") return kind;
  return null;
}

function addToPack(pack: InventoryItem[], entry: InventoryItem): InventoryItem[] {
  const i = pack.findIndex((it) => it.name === entry.name);
  if (i === -1) return [...pack, entry];
  const next = [...pack];
  next[i] = { ...next[i], qty: next[i].qty + entry.qty };
  return next;
}

export interface PartyResult {
  state: GameState;
  ok: boolean;
  message: string;
}

/** Equip pack item `invIndex` onto member `memberIndex`; any item already in
 *  that slot returns to the pack. */
export function equip(
  state: GameState,
  memberIndex: number,
  invIndex: number,
): PartyResult {
  const member = state.party.members[memberIndex];
  const item = state.party.inventory[invIndex];
  if (!member || !item) return { state, ok: false, message: "" };
  const slot = kindToSlot(item.kind);
  if (!slot) return { state, ok: false, message: `${item.name} can't be equipped.` };

  let inventory = [...state.party.inventory];
  if (item.qty > 1) inventory[invIndex] = { ...item, qty: item.qty - 1 };
  else inventory.splice(invIndex, 1);

  const prev = member.equipment[slot];
  if (prev) {
    inventory = addToPack(inventory, {
      name: prev.name,
      kind: prev.kind,
      value: prev.value,
      qty: 1,
      attack: prev.attack,
      defense: prev.defense,
    });
  }

  const equipped = {
    name: item.name,
    kind: item.kind,
    attack: item.attack ?? 0,
    defense: item.defense ?? 0,
    value: item.value,
  };
  const members = state.party.members.map((m, i) =>
    i === memberIndex ? { ...m, equipment: { ...m.equipment, [slot]: equipped } } : m,
  );
  const message = `${member.name} equips ${item.name}.`;
  return {
    state: { ...state, party: { ...state.party, inventory, members }, log: [...state.log, message].slice(-8) },
    ok: true,
    message,
  };
}

export function unequip(
  state: GameState,
  memberIndex: number,
  slot: EquipSlot,
): PartyResult {
  const member = state.party.members[memberIndex];
  if (!member) return { state, ok: false, message: "" };
  const item = member.equipment[slot];
  if (!item) return { state, ok: false, message: "" };

  const inventory = addToPack(state.party.inventory, {
    name: item.name,
    kind: item.kind,
    value: item.value,
    qty: 1,
    attack: item.attack,
    defense: item.defense,
  });
  const equipment = { ...member.equipment };
  delete equipment[slot];
  const members = state.party.members.map((m, i) =>
    i === memberIndex ? { ...m, equipment } : m,
  );
  const message = `${member.name} unequips ${item.name}.`;
  return {
    state: { ...state, party: { ...state.party, inventory, members }, log: [...state.log, message].slice(-8) },
    ok: true,
    message,
  };
}
