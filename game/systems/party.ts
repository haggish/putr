// Party & characters (Beads qb2.1 / qb2.2 / qb2.3). Pure: a default roster,
// derived combat stats, and equip/unequip that move gear between the shared
// pack and a member's slots. Item effects in combat arrive with the combat bead.

import type {
  Character,
  CharacterClass,
  EquipSlot,
  GameState,
  InventoryItem,
  Race,
} from "../types";

export const RACES: Race[] = ["HUMAN", "ELF", "DWARF", "HALFLING", "GNOME"];
export const CLASSES: CharacterClass[] = [
  "FIGHTER",
  "CLERIC",
  "WIZARD",
  "THIEF",
  "PALADIN",
  "RANGER",
  "BARBARIAN",
  "DRUID",
];

const CLASS_HP: Record<CharacterClass, number> = {
  FIGHTER: 30,
  BARBARIAN: 32,
  PALADIN: 28,
  RANGER: 24,
  THIEF: 22,
  CLERIC: 24,
  DRUID: 24,
  WIZARD: 18,
};

/** Build a fresh level-1 character; max HP comes from the class. */
export function makeCharacter(input: {
  name: string;
  race: Race;
  class: CharacterClass;
  stats: { str: number; dex: number; int: number; wis: number };
}): Character {
  const maxHp = CLASS_HP[input.class];
  return {
    name: input.name.trim() || "Adventurer",
    race: input.race,
    class: input.class,
    level: 1,
    xp: 0,
    hp: maxHp,
    maxHp,
    stats: { ...input.stats },
    equipment: {},
  };
}

/** The default starting party (four classic archetypes). */
export function createDefaultParty(): Character[] {
  return [
    { name: "Ragna", race: "HUMAN", class: "FIGHTER", level: 1, xp: 0, hp: 30, maxHp: 30, stats: { str: 15, dex: 11, int: 8, wis: 9 }, equipment: {} },
    { name: "Bruno", race: "DWARF", class: "CLERIC", level: 1, xp: 0, hp: 24, maxHp: 24, stats: { str: 12, dex: 10, int: 10, wis: 14 }, equipment: {} },
    { name: "Sela", race: "ELF", class: "WIZARD", level: 1, xp: 0, hp: 18, maxHp: 18, stats: { str: 8, dex: 12, int: 15, wis: 11 }, equipment: {} },
    { name: "Pip", race: "HALFLING", class: "THIEF", level: 1, xp: 0, hp: 22, maxHp: 22, stats: { str: 9, dex: 15, int: 11, wis: 8 }, equipment: {} },
  ];
}

/** XP needed to advance FROM `level` to the next. */
export function xpForNextLevel(level: number): number {
  return level * 100;
}

const PRIMARY_STAT: Record<CharacterClass, keyof Character["stats"]> = {
  FIGHTER: "str",
  BARBARIAN: "str",
  PALADIN: "str",
  THIEF: "dex",
  RANGER: "dex",
  WIZARD: "int",
  CLERIC: "wis",
  DRUID: "wis",
};

function levelUpOnce(c: Character): Character {
  const stats = { ...c.stats };
  stats[PRIMARY_STAT[c.class]] += 1;
  const maxHp = c.maxHp + 6;
  return { ...c, level: c.level + 1, maxHp, hp: maxHp, stats };
}

/** Grant XP to living members and apply level-ups (max HP + primary stat, full
 *  heal on level). Returns new members plus human-readable level-up messages. */
export function grantXp(
  members: Character[],
  xp: number,
): { members: Character[]; ups: string[] } {
  const ups: string[] = [];
  const out = members.map((m) => {
    if (m.hp <= 0 || xp <= 0) return m;
    let c: Character = { ...m, xp: (m.xp ?? 0) + xp };
    while (c.xp >= xpForNextLevel(c.level)) {
      c = { ...levelUpOnce(c), xp: c.xp - xpForNextLevel(c.level) };
      ups.push(`${c.name} reaches level ${c.level}!`);
    }
    return c;
  });
  return { members: out, ups };
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

const CLASS_SPRITE: Record<CharacterClass, string> = {
  FIGHTER: "fighter",
  CLERIC: "cleric",
  WIZARD: "wizard",
  THIEF: "rogue",
  PALADIN: "paladin",
  RANGER: "ranger",
  BARBARIAN: "barbarian",
  DRUID: "druid",
};

/** Sprite key for a character's class (see SPRITES); "hero" as a fallback. */
export function heroSprite(c: Character): string {
  return CLASS_SPRITE[c.class] ?? "hero";
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

/** Eat consumable pack item `invIndex` to heal member `memberIndex`. Healing
 *  scales with the item's price (~1 HP per 3 gold) and is capped at maxHp — so
 *  cheap street food is a snack and a pricey dish is a real heal; the item is
 *  only spent if it actually heals. */
export function consume(
  state: GameState,
  memberIndex: number,
  invIndex: number,
): PartyResult {
  const member = state.party.members[memberIndex];
  const item = state.party.inventory[invIndex];
  if (!member || !item) return { state, ok: false, message: "" };
  if (item.kind !== "consumable") {
    return { state, ok: false, message: `${item.name} can't be eaten.` };
  }
  if (member.hp >= member.maxHp) {
    return { state, ok: false, message: `${member.name} is already at full HP.` };
  }
  const heal = Math.max(1, Math.round(item.value / 3));
  const hp = Math.min(member.maxHp, member.hp + heal);
  const gained = hp - member.hp;

  const inventory = [...state.party.inventory];
  if (item.qty > 1) inventory[invIndex] = { ...item, qty: item.qty - 1 };
  else inventory.splice(invIndex, 1);
  const members = state.party.members.map((m, i) =>
    i === memberIndex ? { ...m, hp } : m,
  );
  const message = `${member.name} eats ${item.name} (+${gained} HP).`;
  return {
    state: { ...state, party: { ...state.party, inventory, members }, log: [...state.log, message].slice(-8) },
    ok: true,
    message,
  };
}
