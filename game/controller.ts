// Browser-side controller: owns the mutable GameState, turns key events into
// engine steps, and drives the renderer. The React /play component creates one
// against its <canvas>. Movement is event-driven (Ultima-style discrete steps),
// so no continuous rAF loop is needed yet — the renderer is called on change.

import type { EquipSlot, GameState } from "./types";
import { createInitialState } from "./state";
import { keyToDirection } from "./input";
import { step } from "./systems/movement";
import { clearDungeon, enterInterior, exitInterior } from "./systems/interior";
import { buyItem, sellItem, menuFor } from "./systems/shop";
import {
  equip as equipMember,
  unequip as unequipMember,
  consume as consumeMember,
} from "./systems/party";
import { combatAct, fleeCombat, resolveCombat, startCombat } from "./systems/combat";
import { clubBoss, clubEncounter, rollEncounter } from "./systems/monsters";
import { tileAt } from "./world";
import type { CanvasRenderer } from "./renderer/canvasRenderer";
import type { VenueInfo } from "./world-asset";

const ACTION_KEYS = new Set(["Enter", "e", "E", " "]);

export class GameController {
  private state: GameState;
  private pendingBoss = false;

  constructor(
    private readonly renderer: CanvasRenderer,
    initial?: GameState,
    private readonly venues?: Map<string, VenueInfo>,
  ) {
    this.state = initial ?? createInitialState();
  }

  getState(): GameState {
    return this.state;
  }

  render(): void {
    this.renderer.render(this.state);
  }

  /** Handle a raw key; returns true if we consumed it. */
  handleKey(key: string): boolean {
    if (this.state.mode === "combat") return this.combatKey(key);
    if (ACTION_KEYS.has(key)) return this.interact();

    const dir = keyToDirection(key);
    if (!dir) return false;
    const result = step(this.state, dir);
    this.state = result.state;

    if (result.moved && this.state.mode === "interior") {
      const d = this.state.dungeon;
      const pos = this.state.party.position;
      if (d) {
        // Night-club dungeon: door exits, boss tile fights the boss, and
        // wandering triggers exotic encounters.
        if (pos.x === d.doorAt.x && pos.y === d.doorAt.y) {
          this.state = exitInterior(this.state);
        } else if (!d.cleared && pos.x === d.bossAt.x && pos.y === d.bossAt.y) {
          this.pendingBoss = true;
          this.state = startCombat(this.state, [clubBoss()]);
        } else if (Math.random() < 0.14) {
          this.state = startCombat(this.state, clubEncounter());
        }
      } else {
        // Normal interior: stepping onto the door leads back outside.
        const t = tileAt(this.state.currentMap, pos);
        if (t?.kind === "venue") this.state = exitInterior(this.state);
      }
    } else if (result.moved && this.state.mode === "overworld") {
      // Random encounters on open ground.
      const t = tileAt(this.state.currentMap, this.state.party.position);
      if (
        t &&
        (t.kind === "street" || t.kind === "park") &&
        Math.random() < 0.1
      ) {
        this.state = startCombat(this.state, rollEncounter(t.kind));
      }
    }
    this.render();
    return true;
  }

  /** Combat input: arrows move/attack the active member; F flees. */
  private combatKey(key: string): boolean {
    if (key === "f" || key === "F") {
      // Flee resolves immediately (no victory animation).
      this.pendingBoss = false;
      this.state = resolveCombat(fleeCombat(this.state));
      this.render();
      return true;
    }
    const dir = keyToDirection(key);
    if (!dir) return false;
    // Apply the action but DON'T resolve on a win/loss — the client plays the
    // outcome animation, then calls finalizeCombat().
    this.state = combatAct(this.state, dir);
    this.render();
    return true;
  }

  /** Finish a decided combat (called after the outcome animation). Clears the
   *  dungeon if the boss just fell. */
  finalizeCombat(): void {
    if (!this.state.combat?.outcome) return;
    const won = this.state.combat.outcome === "won";
    let resolved = resolveCombat(this.state);
    if (this.pendingBoss) {
      this.pendingBoss = false;
      if (won && resolved.dungeon) resolved = clearDungeon(resolved);
    }
    this.state = resolved;
    this.render();
  }

  /** Enter a venue you're standing on, or leave the interior you're in. */
  private interact(): boolean {
    if (this.state.mode === "interior") {
      this.state = exitInterior(this.state);
      this.render();
      return true;
    }
    const pos = this.state.party.position;
    const t = tileAt(this.state.currentMap, pos);
    if (t?.kind === "venue") {
      const venue = this.venues?.get(`${pos.x},${pos.y}`);
      if (venue) {
        this.state = enterInterior(this.state, venue);
        this.render();
        return true;
      }
    }
    return false;
  }

  /** Buy a catalog item in the current shop; returns true on success. */
  buy(itemId: string): boolean {
    const item = menuFor(this.state).find((i) => i.id === itemId);
    if (!item) return false;
    const r = buyItem(this.state, item);
    this.state = r.state;
    return r.ok;
  }

  /** Sell the pack item at `index`; returns true on success. */
  sell(index: number): boolean {
    const r = sellItem(this.state, index);
    this.state = r.state;
    return r.ok;
  }

  /** Equip pack item `invIndex` onto party member `memberIndex`. */
  equip(memberIndex: number, invIndex: number): boolean {
    const r = equipMember(this.state, memberIndex, invIndex);
    this.state = r.state;
    return r.ok;
  }

  /** Unequip a slot on party member `memberIndex`, returning it to the pack. */
  unequip(memberIndex: number, slot: EquipSlot): boolean {
    const r = unequipMember(this.state, memberIndex, slot);
    this.state = r.state;
    return r.ok;
  }

  /** Eat consumable pack item `invIndex` to heal member `memberIndex`. */
  consume(memberIndex: number, invIndex: number): boolean {
    const r = consumeMember(this.state, memberIndex, invIndex);
    this.state = r.state;
    if (r.ok) this.render();
    return r.ok;
  }

  /** Fast-travel the party to a station tile (only meaningful on the overworld). */
  travelTo(x: number, y: number, name?: string): void {
    if (this.state.mode !== "overworld") return;
    const log = [
      ...this.state.log,
      name ? `You ride the rails to ${name}.` : "You ride the rails.",
    ].slice(-8);
    this.state = {
      ...this.state,
      party: { ...this.state.party, position: { x, y } },
      log,
    };
    this.render();
  }
}
