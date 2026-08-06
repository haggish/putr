// Monster roster + encounter tables (Bead dfm.2). Weighted by the terrain the
// party is on. Names include the requested realistic foes plus a few original
// "unreal" ones. Effects/leveling arrive later; here each is stats + reward.

export interface MonsterTemplate {
  name: string;
  hp: number;
  atk: number;
  def: number;
  reward: number;
  xp: number;
}

const MONSTERS: Record<string, MonsterTemplate> = {
  addict: { name: "Drug Addict", hp: 8, atk: 3, def: 0, reward: 4, xp: 5 },
  thief: { name: "Thief", hp: 12, atk: 4, def: 1, reward: 8, xp: 10 },
  boar: { name: "Wild Boar", hp: 18, atk: 5, def: 2, reward: 6, xp: 12 },
  // "unreal" / exotic foes
  wraith: { name: "Neon Wraith", hp: 14, atk: 6, def: 2, reward: 15, xp: 20 },
  troll: { name: "U-Bahn Troll", hp: 26, atk: 7, def: 3, reward: 20, xp: 30 },
  specter: { name: "Rave Specter", hp: 16, atk: 6, def: 1, reward: 14, xp: 18 },
};

// Weighted draw lists keyed by tile kind (repeats = higher chance).
const TABLES: Record<string, string[]> = {
  street: ["addict", "addict", "thief", "thief", "wraith"],
  park: ["boar", "boar", "addict", "specter"],
};

/** Roll 1-3 monsters appropriate to the tile. `rng` is injectable for tests. */
export function rollEncounter(
  tileKind: string,
  rng: () => number = Math.random,
): MonsterTemplate[] {
  const table = TABLES[tileKind] ?? TABLES.street;
  const count = 1 + Math.floor(rng() * 3);
  const out: MonsterTemplate[] = [];
  for (let i = 0; i < count; i++) {
    const key = table[Math.floor(rng() * table.length)];
    out.push({ ...MONSTERS[key] });
  }
  return out;
}
