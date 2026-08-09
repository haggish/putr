// Browser adapter: draws a GameState to a 2D canvas through an ~11x11 viewport
// centered on the party. Uses flat colors as placeholders; the pixel-art
// tileset bead swaps these for sprites from the atlas.

import type { GameState, Tile, TileKind } from "../types";
import {
  renderTilePattern,
  SPRITES,
  STAR_OVERLAYS,
  starOverlayKey,
  TILE_PATTERNS,
  VENUE_TILES,
  VENUE_LANDMARK_TILES,
  venueIconKey,
  type TilePattern,
} from "./tiles";
import { heroSprite } from "../systems/party";

export const TILE_COLORS: Record<TileKind, string> = {
  water: "#2a4d69",
  street: "#3a3a3a",
  building: "#5a5a5a",
  park: "#2f6b3a",
  rail: "#7a5a2a",
  plaza: "#6d5a3f",
  venue: "#b08d2a",
  station: "#2a4b9b",
};

export interface RendererOptions {
  /** Pixels per tile. */
  tileSize?: number;
  /** Visible tiles across; odd keeps the party centered. */
  viewTiles?: number;
}

/** Animation durations (ms). Shared with the client that drives the timing. */
export const COMBAT_ANIM = { hit: 200, death: 420, victory: 1100 };

/** Transient combat effects, supplied per frame by the browser render loop. */
export interface CombatFx {
  now: number;
  /** combatant id -> timestamp it was hit. */
  hits: Map<string, number>;
  /** combatant id -> timestamp it started dying. */
  deaths: Map<string, number>;
  /** Winning side's victory bob, if combat is over. */
  victory?: { at: number; side: "party" | "monster" };
}

export class CanvasRenderer {
  private readonly tileSize: number;
  private readonly viewTiles: number;
  private readonly atlas: Partial<Record<TileKind, HTMLCanvasElement>> = {};
  private readonly venueAtlas: Partial<Record<string, HTMLCanvasElement>> = {};
  private readonly sprites: Partial<Record<string, HTMLCanvasElement>> = {};

  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    opts: RendererOptions = {},
  ) {
    this.tileSize = opts.tileSize ?? 32;
    this.viewTiles = opts.viewTiles ?? 11;
    this.buildAtlas();
  }

  /** Pre-bake each pixel pattern into a reusable tile-sized canvas. */
  private buildAtlas(): void {
    if (typeof document === "undefined") return;
    const bake = (pattern: TilePattern) => {
      const c = document.createElement("canvas");
      c.width = this.tileSize;
      c.height = this.tileSize;
      const cx = c.getContext("2d");
      if (cx) renderTilePattern(cx, pattern, 0, 0, this.tileSize);
      return c;
    };
    (Object.keys(TILE_PATTERNS) as TileKind[]).forEach((k) => {
      this.atlas[k] = bake(TILE_PATTERNS[k]);
    });
    for (const [key, pattern] of Object.entries({
      ...VENUE_TILES,
      ...VENUE_LANDMARK_TILES,
      ...STAR_OVERLAYS,
    })) {
      this.venueAtlas[key] = bake(pattern);
    }
    for (const key of Object.keys(SPRITES)) {
      this.sprites[key] = bake(SPRITES[key]);
    }
  }

  private drawTile(kind: TileKind, px: number, py: number): void {
    const img = this.atlas[kind];
    if (img) this.ctx.drawImage(img, px, py);
    else {
      this.ctx.fillStyle = TILE_COLORS[kind];
      this.ctx.fillRect(px, py, this.tileSize, this.tileSize);
    }
  }

  /** Draw a tile, using the per-trade (or named-landmark) bitmap for venues. */
  private drawMapTile(tile: Tile, px: number, py: number): void {
    if (tile.kind === "venue" && (tile.venueCategory || tile.venueName)) {
      const key = venueIconKey(tile.venueName, tile.venueCategory);
      const img = this.venueAtlas[key] ?? this.atlas.venue;
      if (img) {
        this.ctx.drawImage(img, px, py);
        // Michelin star badge on top, if any.
        const star = starOverlayKey(tile.venueStars);
        const overlay = star ? this.venueAtlas[star] : undefined;
        if (overlay) this.ctx.drawImage(overlay, px, py);
        return;
      }
    }
    this.drawTile(tile.kind, px, py);
  }

  /** Canvas pixel size this renderer expects. */
  get pixelSize(): number {
    return this.viewTiles * this.tileSize;
  }

  render(state: GameState, fx?: CombatFx): void {
    if (state.combat) return this.renderCombat(state, fx);
    const { currentMap: map, party } = state;
    const ts = this.tileSize;
    const half = Math.floor(this.viewTiles / 2);
    const originX = party.position.x - half;
    const originY = party.position.y - half;

    // Out-of-bounds shows through as black (evokes the fog beyond the Ring).
    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, 0, this.pixelSize, this.pixelSize);

    for (let vy = 0; vy < this.viewTiles; vy++) {
      for (let vx = 0; vx < this.viewTiles; vx++) {
        const mx = originX + vx;
        const my = originY + vy;
        if (mx < 0 || my < 0 || mx >= map.width || my >= map.height) continue;
        const tile = map.tiles[my * map.width + mx];
        if (!tile) continue;
        this.drawMapTile(tile, vx * ts, vy * ts);
      }
    }

    // A stationary keeper standing behind the shop counter, if any is in view.
    if (state.keeper) {
      const kvx = state.keeper.x - originX;
      const kvy = state.keeper.y - originY;
      if (kvx >= 0 && kvy >= 0 && kvx < this.viewTiles && kvy < this.viewTiles) {
        const spr = this.sprites[state.keeper.sprite] ?? this.sprites.keeper;
        if (spr) {
          this.ctx.drawImage(spr, kvx * ts, kvy * ts);
          // Hat/hair overlay drawn on top varies same-trade keepers.
          const ov = state.keeper.overlay
            ? this.sprites[state.keeper.overlay]
            : undefined;
          if (ov) this.ctx.drawImage(ov, kvx * ts, kvy * ts);
        } else {
          this.ctx.fillStyle = "#3a6a3a";
          this.ctx.fillRect(kvx * ts + ts * 0.2, kvy * ts + ts * 0.2, ts * 0.6, ts * 0.6);
        }
      }
    }

    // Party is always centered — drawn as the leader's class.
    const leader = state.party.members[0];
    const hero =
      (leader ? this.sprites[heroSprite(leader)] : undefined) ??
      this.sprites.hero;
    if (hero) {
      this.ctx.drawImage(hero, half * ts, half * ts);
    } else {
      this.ctx.fillStyle = "#e8e8e8";
      this.ctx.fillRect(
        half * ts + ts * 0.2,
        half * ts + ts * 0.2,
        ts * 0.6,
        ts * 0.6,
      );
    }
  }

  /** Render the battle arena (an 11x11 map) with every combatant. */
  private renderCombat(state: GameState, fx?: CombatFx): void {
    const map = state.currentMap;
    const combat = state.combat;
    const ts = this.tileSize;
    const now = fx?.now ?? 0;

    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, 0, this.pixelSize, this.pixelSize);
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const t = map.tiles[y * map.width + x];
        if (t) this.drawTile(t.kind, x * ts, y * ts);
      }
    }
    if (!combat) return;

    for (const c of combat.combatants) {
      let alpha = 1;
      let dx = 0;
      let dy = 0;
      let flash = 0;

      if (c.hp <= 0) {
        const dyingAt = fx?.deaths.get(c.id);
        if (dyingAt === undefined) continue; // already gone
        const p = (now - dyingAt) / COMBAT_ANIM.death;
        if (p >= 1) continue;
        alpha = 1 - p;
        dy = -Math.round(p * ts * 0.5); // fade and rise
      } else {
        const hitAt = fx?.hits.get(c.id);
        if (hitAt !== undefined) {
          const p = (now - hitAt) / COMBAT_ANIM.hit;
          if (p < 1) {
            flash = 1 - p;
            dx = Math.round(Math.sin(p * Math.PI * 4) * 3); // shake
          }
        }
        if (fx?.victory && c.side === fx.victory.side) {
          dy = -Math.abs(Math.round(Math.sin((now - fx.victory.at) / 150) * 3));
        }
      }

      const spr =
        c.side === "party"
          ? (this.sprites[c.sprite ?? "hero"] ?? this.sprites.hero)
          : (this.sprites[c.sprite ?? "foe"] ?? this.sprites.foe);
      const px = c.x * ts + dx;
      const py = c.y * ts + dy;

      this.ctx.globalAlpha = alpha;
      if (spr) {
        this.ctx.drawImage(spr, px, py);
      } else {
        this.ctx.fillStyle = c.side === "party" ? "#dfe6ee" : "#c0392b";
        this.ctx.fillRect(px + ts * 0.15, py + ts * 0.15, ts * 0.7, ts * 0.7);
      }
      this.ctx.globalAlpha = 1;

      if (flash > 0) {
        this.ctx.fillStyle = `rgba(255,255,255,${(0.7 * flash).toFixed(3)})`;
        this.ctx.fillRect(px, py, ts, ts);
      }

      if (c.hp > 0 && c.id === combat.activeId && !fx?.victory) {
        this.ctx.strokeStyle = "#f1c40f";
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(c.x * ts + 2, c.y * ts + 2, ts - 4, ts - 4);
      }
    }
  }
}
