"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CanvasRenderer,
  GameController,
  shopCatalogFor,
  stateFromAsset,
  TILE_COLORS,
  venueMap,
  type GameState,
  type InventoryItem,
  type ShopItem,
  type TileKind,
  type VenueInfo,
  type WorldAsset,
} from "@/game";

type Hud = {
  x: number;
  y: number;
  facing: string;
  district?: string;
  place?: VenueInfo | null;
  locationName?: string;
  gold: number;
  inventory: InventoryItem[];
  shop: ShopItem[];
  log: string[];
};

const LEGEND: [TileKind, string][] = [
  ["street", "street"],
  ["park", "park"],
  ["water", "water"],
  ["building", "building"],
  ["rail", "the Ring"],
  ["venue", "venue"],
];

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<GameController | null>(null);
  const venuesRef = useRef<Map<string, VenueInfo>>(new Map());
  const [hud, setHud] = useState<Hud | null>(null);

  // Read current engine state into the HUD. Stable, so shop buttons and the
  // key handler can both call it.
  const refresh = useCallback(() => {
    const c = controllerRef.current;
    if (!c) return;
    const s = c.getState();
    const { x, y } = s.party.position;
    const tile = s.currentMap.tiles[y * s.currentMap.width + x];
    setHud({
      x,
      y,
      facing: s.party.facing,
      district: tile?.district,
      place: venuesRef.current.get(`${x},${y}`) ?? null,
      locationName: s.locationName,
      gold: s.party.gold,
      inventory: s.party.inventory,
      shop: shopCatalogFor(s.locationCategory),
      log: s.log,
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renderer = new CanvasRenderer(ctx, { tileSize: 32, viewTiles: 11 });
    canvas.width = renderer.pixelSize;
    canvas.height = renderer.pixelSize;

    let disposed = false;

    const attach = (initial?: GameState) => {
      if (disposed) return;
      const controller = new GameController(renderer, initial, venuesRef.current);
      controllerRef.current = controller;
      controller.render();
      refresh();
    };

    const onKey = (e: KeyboardEvent) => {
      // Let a focused shop button handle its own activation keys.
      const isButton = (e.target as HTMLElement)?.tagName === "BUTTON";
      if (isButton && ["Enter", " ", "e", "E"].includes(e.key)) return;
      if (controllerRef.current?.handleKey(e.key)) {
        e.preventDefault(); // stop arrow keys from scrolling the page
        refresh();
      }
    };
    window.addEventListener("keydown", onKey);

    // Load the real Berlin overworld; fall back to the placeholder map.
    fetch("/world/berlin-overworld.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("no asset"))))
      .then((asset: WorldAsset) => {
        venuesRef.current = venueMap(asset);
        attach(stateFromAsset(asset));
      })
      .catch(() => attach());

    return () => {
      disposed = true;
      window.removeEventListener("keydown", onKey);
    };
  }, [refresh]);

  const buy = (id: string) => {
    controllerRef.current?.buy(id);
    refresh();
  };
  const sell = (i: number) => {
    controllerRef.current?.sell(i);
    refresh();
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <canvas
        ref={canvasRef}
        className="rounded-lg border border-neutral-800 bg-black"
        style={{ width: 704, height: 704, imageRendering: "pixelated" }}
        aria-label="Game map"
      />

      <aside className="w-full max-w-xs space-y-4 font-mono text-sm">
        <div className="rounded-lg border border-neutral-200 bg-white p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Party
          </div>
          {hud ? (
            <ul className="space-y-1 text-neutral-700">
              <li>
                Position: ({hud.x}, {hud.y})
              </li>
              <li>Facing: {hud.facing}</li>
              <li>Gold: {hud.gold}g</li>
              {hud.district ? <li>District: {hud.district}</li> : null}
              {hud.locationName ? (
                <li className="text-amber-700">Inside: {hud.locationName}</li>
              ) : hud.place ? (
                <li className="text-amber-700">
                  Here: {hud.place.name} ({hud.place.category.toLowerCase()}) —
                  press Enter
                </li>
              ) : null}
            </ul>
          ) : (
            <p className="text-neutral-500">Loading…</p>
          )}
        </div>

        {hud?.locationName ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
              Shop — {hud.locationName}
            </div>
            {hud.shop.length ? (
              <ul className="space-y-1 text-neutral-700">
                {hud.shop.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span>
                      {item.name} — {item.price}g
                    </span>
                    <button
                      type="button"
                      onClick={() => buy(item.id)}
                      disabled={hud.gold < item.price}
                      className="rounded border border-neutral-300 px-2 py-0.5 text-xs hover:bg-neutral-100 disabled:opacity-40"
                    >
                      Buy
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-neutral-500">Nothing for sale here.</p>
            )}

            {hud.inventory.length ? (
              <>
                <div className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Your pack
                </div>
                <ul className="space-y-1 text-neutral-700">
                  {hud.inventory.map((it, i) => (
                    <li
                      key={it.name}
                      className="flex items-center justify-between gap-2"
                    >
                      <span>
                        {it.name} ×{it.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => sell(i)}
                        className="rounded border border-neutral-300 px-2 py-0.5 text-xs hover:bg-neutral-100"
                      >
                        Sell
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-lg border border-neutral-200 bg-white p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Messages
          </div>
          <ul className="space-y-1 text-neutral-700">
            {hud?.log.slice(-6).map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Legend
          </div>
          <ul className="space-y-1">
            {LEGEND.map(([kind, label]) => (
              <li
                key={kind}
                className="flex items-center gap-2 text-neutral-700"
              >
                <span
                  className="inline-block h-3 w-3 rounded-sm border border-neutral-300"
                  style={{ backgroundColor: TILE_COLORS[kind] }}
                />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-neutral-500">
          Move with the arrow keys or WASD. Press{" "}
          <span className="font-semibold">Enter</span> on a gold venue to go
          inside — shops let you buy &amp; sell. Step through the door (or press
          Enter) to leave.
        </p>
      </aside>
    </div>
  );
}
