"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CanvasRenderer,
  GameController,
  characterAttack,
  characterDefense,
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

type MemberView = {
  name: string;
  race: string;
  class: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  weapon?: string;
  armor?: string;
};

type Hud = {
  x: number;
  y: number;
  facing: string;
  district?: string;
  place?: VenueInfo | null;
  locationName?: string;
  gold: number;
  shop: ShopItem[];
  inventory: InventoryItem[];
  members: MemberView[];
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

const EQUIPPABLE = new Set(["weapon", "armor", "shield"]);

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<GameController | null>(null);
  const venuesRef = useRef<Map<string, VenueInfo>>(new Map());
  const [hud, setHud] = useState<Hud | null>(null);
  const [selected, setSelected] = useState(0);

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
      shop: shopCatalogFor(s.locationCategory),
      inventory: s.party.inventory,
      members: s.party.members.map((m) => ({
        name: m.name,
        race: m.race,
        class: m.class,
        hp: m.hp,
        maxHp: m.maxHp,
        atk: characterAttack(m),
        def: characterDefense(m),
        weapon: m.equipment.weapon?.name,
        armor: m.equipment.armor?.name,
      })),
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
      const isButton = (e.target as HTMLElement)?.tagName === "BUTTON";
      if (isButton && ["Enter", " ", "e", "E"].includes(e.key)) return;
      if (controllerRef.current?.handleKey(e.key)) {
        e.preventDefault();
        refresh();
      }
    };
    window.addEventListener("keydown", onKey);

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
  const doEquip = (i: number) => {
    controllerRef.current?.equip(selected, i);
    refresh();
  };
  const doUnequip = (member: number, slot: "weapon" | "armor") => {
    controllerRef.current?.unequip(member, slot);
    refresh();
  };

  const inShop = !!hud?.locationName && (hud?.shop.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <canvas
        ref={canvasRef}
        className="rounded-lg border border-neutral-800 bg-black"
        style={{ width: 704, height: 704, imageRendering: "pixelated" }}
        aria-label="Game map"
      />

      <aside className="w-full max-w-sm space-y-4 font-mono text-sm">
        <div className="rounded-lg border border-neutral-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Party
            </span>
            <span className="text-xs text-amber-700">{hud?.gold ?? 0}g</span>
          </div>
          {hud ? (
            <>
              <ul className="mb-2 space-y-1 text-neutral-700">
                <li className="text-xs text-neutral-500">
                  ({hud.x}, {hud.y}) · {hud.facing}
                  {hud.district ? ` · ${hud.district}` : ""}
                </li>
                {hud.locationName ? (
                  <li className="text-amber-700">Inside: {hud.locationName}</li>
                ) : hud.place ? (
                  <li className="text-amber-700">
                    Here: {hud.place.name} ({hud.place.category.toLowerCase()}) —
                    press Enter
                  </li>
                ) : null}
              </ul>
              <ul className="space-y-2">
                {hud.members.map((m, i) => (
                  <li key={m.name}>
                    <button
                      type="button"
                      onClick={() => setSelected(i)}
                      className={`w-full rounded border px-2 py-1 text-left ${
                        selected === i
                          ? "border-amber-400 bg-amber-50"
                          : "border-neutral-200 hover:bg-neutral-50"
                      }`}
                    >
                      <div className="flex justify-between">
                        <span className="font-semibold">{m.name}</span>
                        <span className="text-xs text-neutral-500">
                          {m.race.toLowerCase()} {m.class.toLowerCase()}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full rounded bg-neutral-200">
                        <div
                          className="h-1.5 rounded bg-green-600"
                          style={{
                            width: `${Math.round((m.hp / m.maxHp) * 100)}%`,
                          }}
                        />
                      </div>
                      <div className="mt-1 flex justify-between text-xs text-neutral-600">
                        <span>
                          HP {m.hp}/{m.maxHp}
                        </span>
                        <span>
                          ATK {m.atk} · DEF {m.def}
                        </span>
                      </div>
                    </button>
                    {(m.weapon || m.armor) && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {m.weapon && (
                          <button
                            type="button"
                            onClick={() => doUnequip(i, "weapon")}
                            className="rounded border border-neutral-300 px-1 text-[10px] hover:bg-neutral-100"
                          >
                            ⚔ {m.weapon} ✕
                          </button>
                        )}
                        {m.armor && (
                          <button
                            type="button"
                            onClick={() => doUnequip(i, "armor")}
                            className="rounded border border-neutral-300 px-1 text-[10px] hover:bg-neutral-100"
                          >
                            🛡 {m.armor} ✕
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-neutral-500">Loading…</p>
          )}
        </div>

        {inShop && hud ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
              Shop — {hud.locationName}
            </div>
            <ul className="space-y-1 text-neutral-700">
              {hud.shop.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span>
                    {item.name} — {item.price}g
                    {item.attack ? ` (ATK ${item.attack})` : ""}
                    {item.defense ? ` (DEF ${item.defense})` : ""}
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
          </div>
        ) : null}

        {hud && hud.inventory.length > 0 ? (
          <div className="rounded-lg border border-neutral-200 bg-white p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Pack{" "}
              <span className="normal-case text-neutral-400">
                (equip → {hud.members[selected]?.name})
              </span>
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
                  <span className="flex gap-1">
                    {EQUIPPABLE.has(it.kind) && (
                      <button
                        type="button"
                        onClick={() => doEquip(i)}
                        className="rounded border border-neutral-300 px-2 py-0.5 text-xs hover:bg-neutral-100"
                      >
                        Equip
                      </button>
                    )}
                    {inShop && (
                      <button
                        type="button"
                        onClick={() => sell(i)}
                        className="rounded border border-neutral-300 px-2 py-0.5 text-xs hover:bg-neutral-100"
                      >
                        Sell
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
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
          <ul className="grid grid-cols-2 gap-1">
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
          inside — shops let you buy, sell &amp; equip gear onto the selected
          party member. Step through the door (or press Enter) to leave.
        </p>
      </aside>
    </div>
  );
}
