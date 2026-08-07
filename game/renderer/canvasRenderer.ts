// Browser adapter: draws a GameState to a 2D canvas through an ~11x11 viewport
// centered on the party. Uses flat colors as placeholders; the pixel-art
// tileset bead swaps these for sprites from the atlas.

import type { GameState, TileKind } from "../types";
import {
  renderTilePattern,
  SPRITES,
  TILE_PATTERNS,
  type TilePattern,
} from "./tiles";

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

export class CanvasRenderer {
  private readonly tileSize: number;
  private readonly viewTiles: number;
  private readonly atlas: Partial<Record<TileKind, HTMLCanvasElement>> = {};
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

  /** Canvas pixel size this renderer expects. */
  get pixelSize(): number {
    return this.viewTiles * this.tileSize;
  }

  render(state: GameState): void {
    if (state.combat) return this.renderCombat(state);
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
        this.drawTile(tile.kind, vx * ts, vy * ts);
      }
    }

    // Party is always centered.
    const hero = this.sprites.hero;
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
  private renderCombat(state: GameState): void {
    const map = state.currentMap;
    const combat = state.combat;
    const ts = this.tileSize;

    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, 0, this.pixelSize, this.pixelSize);
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const t = map.tiles[y * map.width + x];
        if (!t) continue;
        this.drawTile(t.kind, x * ts, y * ts);
      }
    }
    if (!combat) return;
    for (const c of combat.combatants) {
      if (c.hp <= 0) continue;
      const spr =
        c.side === "party"
          ? this.sprites.hero
          : (this.sprites[c.sprite ?? "foe"] ?? this.sprites.foe);
      if (spr) {
        this.ctx.drawImage(spr, c.x * ts, c.y * ts);
      } else {
        this.ctx.fillStyle = c.side === "party" ? "#dfe6ee" : "#c0392b";
        this.ctx.fillRect(
          c.x * ts + ts * 0.15,
          c.y * ts + ts * 0.15,
          ts * 0.7,
          ts * 0.7,
        );
      }
      if (c.id === combat.activeId) {
        this.ctx.strokeStyle = "#f1c40f";
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(c.x * ts + 2, c.y * ts + 2, ts - 4, ts - 4);
      }
    }
  }
}
