// Browser adapter: draws a GameState to a 2D canvas through an ~11x11 viewport
// centered on the party. Uses flat colors as placeholders; the pixel-art
// tileset bead swaps these for sprites from the atlas.

import type { GameState, TileKind } from "../types";

export const TILE_COLORS: Record<TileKind, string> = {
  water: "#2a4d69",
  street: "#3a3a3a",
  building: "#5a5a5a",
  park: "#2f6b3a",
  rail: "#7a5a2a",
  plaza: "#6d5a3f",
  venue: "#b08d2a",
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

  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    opts: RendererOptions = {},
  ) {
    this.tileSize = opts.tileSize ?? 32;
    this.viewTiles = opts.viewTiles ?? 11;
  }

  /** Canvas pixel size this renderer expects. */
  get pixelSize(): number {
    return this.viewTiles * this.tileSize;
  }

  render(state: GameState): void {
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
        this.ctx.fillStyle = TILE_COLORS[tile.kind];
        this.ctx.fillRect(vx * ts, vy * ts, ts, ts);
      }
    }

    // Party is always centered.
    this.ctx.fillStyle = "#e8e8e8";
    this.ctx.fillRect(
      half * ts + ts * 0.2,
      half * ts + ts * 0.2,
      ts * 0.6,
      ts * 0.6,
    );
  }
}
