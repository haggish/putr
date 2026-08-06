// Tile combat (Beads dfm.1 / dfm.3). Pure & deterministic (damage = ATK - DEF,
// min 1) so it unit-tests cleanly. Party acts one member at a time (arrows move
// or attack an adjacent foe); when all have acted, monsters take AI turns.
// Reuses the tile renderer via a small arena GameMap.

import type { Combatant, Direction, GameMap, GameState, Tile } from "../types";
import { DIRECTIONS } from "../types";
import { characterAttack, characterDefense } from "./party";
import type { MonsterTemplate } from "./monsters";

const ARENA = 11;

function arenaMap(): GameMap {
  const tiles: Tile[] = [];
  for (let y = 0; y < ARENA; y++) {
    for (let x = 0; x < ARENA; x++) {
      const border = x === 0 || y === 0 || x === ARENA - 1 || y === ARENA - 1;
      tiles.push({ kind: border ? "building" : "plaza" });
    }
  }
  return { id: "combat", width: ARENA, height: ARENA, tiles };
}

const occupant = (cs: Combatant[], x: number, y: number) =>
  cs.find((c) => c.hp > 0 && c.x === x && c.y === y);
const living = (cs: Combatant[], side: "party" | "monster") =>
  cs.filter((c) => c.side === side && c.hp > 0);

export function startCombat(
  state: GameState,
  monsters: MonsterTemplate[],
): GameState {
  const combatants: Combatant[] = [];
  state.party.members.forEach((m, i) => {
    combatants.push({
      id: `p${i}`,
      name: m.name,
      side: "party",
      x: 3 + i,
      y: ARENA - 3,
      hp: Math.max(1, m.hp),
      maxHp: m.maxHp,
      atk: characterAttack(m),
      def: characterDefense(m),
      memberIndex: i,
    });
  });
  monsters.forEach((mo, i) => {
    combatants.push({
      id: `m${i}`,
      name: mo.name,
      side: "monster",
      x: 3 + i,
      y: 2,
      hp: mo.hp,
      maxHp: mo.hp,
      atk: mo.atk,
      def: mo.def,
      reward: mo.reward,
    });
  });
  return {
    ...state,
    mode: "combat",
    currentMap: arenaMap(),
    returnTo: {
      map: state.currentMap,
      position: { ...state.party.position },
      mode: "overworld",
    },
    combat: {
      combatants,
      activeId: combatants[0]?.id,
      log: [`Ambushed by ${monsters.map((m) => m.name).join(", ")}!`],
    },
  };
}

function monsterTurns(cs: Combatant[], log: string[]): void {
  for (const m of cs) {
    if (m.side !== "monster" || m.hp <= 0) continue;
    const targets = living(cs, "party");
    if (!targets.length) return;

    let tgt = targets[0];
    let best = Infinity;
    for (const t of targets) {
      const d = Math.abs(t.x - m.x) + Math.abs(t.y - m.y);
      if (d < best) {
        best = d;
        tgt = t;
      }
    }

    if (best === 1) {
      const dmg = Math.max(1, m.atk - tgt.def);
      tgt.hp -= dmg;
      log.push(`${m.name} hits ${tgt.name} for ${dmg}.`);
      if (tgt.hp <= 0) log.push(`${tgt.name} is down!`);
    } else {
      const dx = Math.sign(tgt.x - m.x);
      const dy = Math.sign(tgt.y - m.y);
      const tries =
        Math.abs(tgt.x - m.x) >= Math.abs(tgt.y - m.y)
          ? [{ x: dx, y: 0 }, { x: 0, y: dy }]
          : [{ x: 0, y: dy }, { x: dx, y: 0 }];
      for (const t of tries) {
        if (t.x === 0 && t.y === 0) continue;
        const nx = m.x + t.x;
        const ny = m.y + t.y;
        if (nx > 0 && ny > 0 && nx < ARENA - 1 && ny < ARENA - 1 && !occupant(cs, nx, ny)) {
          m.x = nx;
          m.y = ny;
          break;
        }
      }
    }
  }
}

/** The active party member moves in `dir`, or attacks a foe in that tile. */
export function combatAct(state: GameState, dir: Direction): GameState {
  const c = state.combat;
  if (!c || c.outcome) return state;
  const combatants = c.combatants.map((k) => ({ ...k }));
  const log = [...c.log];
  const active = combatants.find((k) => k.id === c.activeId && k.hp > 0);
  if (!active) return state;

  const d = DIRECTIONS[dir];
  const tx = active.x + d.x;
  const ty = active.y + d.y;
  const foe = combatants.find(
    (k) => k.side === "monster" && k.hp > 0 && k.x === tx && k.y === ty,
  );

  if (foe) {
    const dmg = Math.max(1, active.atk - foe.def);
    foe.hp -= dmg;
    log.push(`${active.name} hits ${foe.name} for ${dmg}.`);
    if (foe.hp <= 0) log.push(`${foe.name} falls.`);
  } else if (
    tx > 0 &&
    ty > 0 &&
    tx < ARENA - 1 &&
    ty < ARENA - 1 &&
    !occupant(combatants, tx, ty)
  ) {
    active.x = tx;
    active.y = ty;
  } else {
    log.push(`${active.name} is blocked.`);
  }

  if (living(combatants, "monster").length === 0) {
    return { ...state, combat: { combatants, activeId: undefined, log, outcome: "won" } };
  }

  // Advance to the next living party member; if all acted, monsters take turns.
  const order = combatants.filter((k) => k.side === "party");
  const idx = order.findIndex((k) => k.id === active.id);
  const next = order.slice(idx + 1).find((k) => k.hp > 0);
  if (next) {
    return { ...state, combat: { combatants, activeId: next.id, log } };
  }

  monsterTurns(combatants, log);
  if (living(combatants, "party").length === 0) {
    return { ...state, combat: { combatants, activeId: undefined, log, outcome: "lost" } };
  }
  const first = combatants.find((k) => k.side === "party" && k.hp > 0)!;
  return { ...state, combat: { combatants, activeId: first.id, log } };
}

export function fleeCombat(state: GameState): GameState {
  if (!state.combat) return state;
  return { ...state, combat: { ...state.combat, outcome: "fled" } };
}

/** Fold a finished combat back into the overworld: write HP back, grant loot
 *  or apply the loss penalty, and restore position. */
export function resolveCombat(state: GameState): GameState {
  const c = state.combat;
  const rt = state.returnTo;
  if (!c || !c.outcome || !rt) return state;

  const members = state.party.members.map((m, i) => {
    const cb = c.combatants.find((k) => k.memberIndex === i);
    return cb ? { ...m, hp: Math.max(0, cb.hp) } : { ...m };
  });
  let gold = state.party.gold;
  const log = [...state.log];

  if (c.outcome === "won") {
    const reward = c.combatants
      .filter((k) => k.side === "monster")
      .reduce((s, k) => s + (k.reward ?? 0), 0);
    gold += reward;
    log.push(`Victory! You loot ${reward}g.`);
  } else if (c.outcome === "lost") {
    gold = Math.floor(gold / 2);
    for (const m of members) m.hp = Math.max(1, m.hp);
    log.push("You black out and wake later, lighter of purse.");
  } else {
    log.push("You slip away from the fight.");
  }

  return {
    ...state,
    mode: rt.mode,
    currentMap: rt.map,
    party: { ...state.party, position: { ...rt.position }, gold, members },
    combat: undefined,
    returnTo: undefined,
    log: log.slice(-8),
  };
}
