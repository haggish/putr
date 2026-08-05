// Browser-side controller: owns the mutable GameState, turns key events into
// engine steps, and drives the renderer. The React /play component creates one
// against its <canvas>. Movement is event-driven (Ultima-style discrete steps),
// so no continuous rAF loop is needed yet — the renderer is called on change.

import type { EquipSlot, GameState } from "./types";
import { createInitialState } from "./state";
import { keyToDirection } from "./input";
import { step } from "./systems/movement";
import { enterInterior, exitInterior } from "./systems/interior";
import { buyItem, sellItem, shopCatalogFor } from "./systems/shop";
import { equip as equipMember, unequip as unequipMember } from "./systems/party";
import { tileAt } from "./world";
import type { CanvasRenderer } from "./renderer/canvasRenderer";
import type { VenueInfo } from "./world-asset";

const ACTION_KEYS = new Set(["Enter", "e", "E", " "]);

export class GameController {
  private state: GameState;

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

  /** Handle a raw key; returns true if we consumed it (movement or action). */
  handleKey(key: string): boolean {
    if (ACTION_KEYS.has(key)) return this.interact();

    const dir = keyToDirection(key);
    if (!dir) return false;
    const result = step(this.state, dir);
    this.state = result.state;

    // Stepping onto the interior door leads back outside.
    if (result.moved && this.state.mode === "interior") {
      const t = tileAt(this.state.currentMap, this.state.party.position);
      if (t?.kind === "venue") this.state = exitInterior(this.state);
    }
    this.render();
    return true;
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
    const item = shopCatalogFor(this.state.locationCategory).find(
      (i) => i.id === itemId,
    );
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
}
