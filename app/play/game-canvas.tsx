"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CanvasRenderer,
  COMBAT_ANIM,
  GameController,
  characterAttack,
  characterDefense,
  npcPersona,
  menuFor,
  stateFromAsset,
  stationList,
  stationMap,
  TILE_COLORS,
  venueMap,
  xpForNextLevel,
  type Direction,
  type GameState,
  type InventoryItem,
  type ShopItem,
  type Station,
  type TileKind,
  type VenueInfo,
  type WorldAsset,
} from "@/game";
import { loadParty, saveParty } from "./actions";
import { npcReply, type NpcTurn } from "./npc-actions";
import { Sfx } from "./sfx";
import { Music } from "./music";
import { encodeExplored, decodeExplored } from "./explored";

type MemberView = {
  name: string;
  race: string;
  class: string;
  level: number;
  xp: number;
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
  cuisine?: string[];
  price?: number;
  onStation?: Station | null;
  gold: number;
  shop: ShopItem[];
  inventory: InventoryItem[];
  members: MemberView[];
  combat?: {
    activeId?: string;
    party: { id: string; name: string; hp: number; maxHp: number }[];
    monsters: { name: string; hp: number; maxHp: number }[];
    log: string[];
  };
  log: string[];
};

const LEGEND: [TileKind, string][] = [
  ["street", "street"],
  ["park", "park"],
  ["water", "water"],
  ["building", "building"],
  ["rail", "the Ring"],
  ["venue", "venue"],
  ["station", "station"],
  ["bridge", "bridge"],
];

const EQUIPPABLE = new Set(["weapon", "armor", "shield"]);

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<GameController | null>(null);
  const venuesRef = useRef<Map<string, VenueInfo>>(new Map());
  const stationByXYRef = useRef<Map<string, Station>>(new Map());
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const sfxRef = useRef<Sfx | null>(null);
  const musicRef = useRef<Music | null>(null);
  const prevGoldRef = useRef(0);
  // Mirrors of UI state so the single keydown handler never reads stale values.
  const selectedRef = useRef(0);
  const packSelRef = useRef(0);
  const talkingRef = useRef(false);
  const allStationsRef = useRef<Station[]>([]);
  // Fog-of-war exploration (overworld) + map-overlay view state.
  const exploredRef = useRef<Uint8Array | null>(null);
  const mapOpenRef = useRef(false);
  const mapZoomRef = useRef(1);
  const mapPanRef = useRef({ x: 0, y: 0 });
  const animRef = useRef({
    prev: new Map<string, number>(),
    hits: new Map<string, number>(),
    deaths: new Map<string, number>(),
    victory: null as null | { at: number; side: "party" | "monster" },
    raf: 0,
  });
  const [hud, setHud] = useState<Hud | null>(null);
  const [selected, setSelected] = useState(0);
  const [packSel, setPackSel] = useState(0);
  const [saved, setSaved] = useState(false);
  const [talking, setTalking] = useState(false);
  const [keeper, setKeeper] = useState("");
  const [npcLog, setNpcLog] = useState<NpcTurn[]>([]);
  const [npcInput, setNpcInput] = useState("");
  const [npcBusy, setNpcBusy] = useState(false);
  const [allStations, setAllStations] = useState<Station[]>([]);
  const [muted, setMuted] = useState(false);
  const [musicOff, setMusicOff] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  const refresh = useCallback(() => {
    const c = controllerRef.current;
    if (!c) return;
    const s = c.getState();
    // Reveal the area around the party on the overworld (fog of war).
    if (s.mode === "overworld" && exploredRef.current) {
      const m = s.currentMap;
      const ex = exploredRef.current;
      const { x, y } = s.party.position;
      const R = 5;
      for (let dy = -R; dy <= R; dy++) {
        for (let dx = -R; dx <= R; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= m.width || ny >= m.height) continue;
          ex[ny * m.width + nx] = 1;
        }
      }
    }
    // A rise in gold means a sale or combat loot — ring the coin.
    if (s.party.gold > prevGoldRef.current) sfxRef.current?.gold();
    prevGoldRef.current = s.party.gold;

    // Background music follows the scene (style varies by venue name).
    const m = musicRef.current;
    if (m) {
      if (s.mode === "combat") m.setScene("combat");
      else if (s.locationCategory === "NIGHTCLUB") m.setScene("club", s.locationName);
      else if (s.locationCategory === "SPAETI") m.setScene("spaeti", s.locationName);
      else if (s.locationName) m.setScene("shop");
      else m.setScene("adventure");
    }
    const { x, y } = s.party.position;
    const tile = s.currentMap.tiles[y * s.currentMap.width + x];
    setHud({
      x,
      y,
      facing: s.party.facing,
      district: tile?.district,
      place: venuesRef.current.get(`${x},${y}`) ?? null,
      onStation:
        tile?.kind === "station"
          ? (stationByXYRef.current.get(`${x},${y}`) ?? null)
          : null,
      locationName: s.locationName,
      cuisine: s.locationCuisine,
      price: s.locationPrice,
      gold: s.party.gold,
      shop: menuFor(s),
      inventory: s.party.inventory,
      members: s.party.members.map((m) => ({
        name: m.name,
        race: m.race,
        class: m.class,
        level: m.level,
        xp: m.xp ?? 0,
        hp: m.hp,
        maxHp: m.maxHp,
        atk: characterAttack(m),
        def: characterDefense(m),
        weapon: m.equipment.weapon?.name,
        armor: m.equipment.armor?.name,
      })),
      combat: s.combat
        ? {
            activeId: s.combat.activeId,
            party: s.combat.combatants
              .filter((k) => k.side === "party")
              .map((k) => ({ id: k.id, name: k.name, hp: k.hp, maxHp: k.maxHp })),
            monsters: s.combat.combatants
              .filter((k) => k.side === "monster")
              .map((k) => ({ name: k.name, hp: k.hp, maxHp: k.maxHp })),
            log: s.combat.log,
          }
        : undefined,
      log: s.log,
    });
  }, []);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
  useEffect(() => {
    packSelRef.current = packSel;
  }, [packSel]);
  useEffect(() => {
    talkingRef.current = talking;
  }, [talking]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renderer = new CanvasRenderer(ctx, { tileSize: 32, viewTiles: 11 });
    rendererRef.current = renderer;
    canvas.width = renderer.pixelSize;
    canvas.height = renderer.pixelSize;

    let disposed = false;
    const anim = animRef.current;
    const sfx = sfxRef.current ?? new Sfx();
    sfxRef.current = sfx;
    const music = musicRef.current ?? new Music();
    musicRef.current = music;

    const attach = (initial?: GameState) => {
      if (disposed) return;
      const controller = new GameController(renderer, initial, venuesRef.current);
      controllerRef.current = controller;
      // Seed the gold baseline so loading a save doesn't ring the coin.
      prevGoldRef.current = controller.getState().party.gold;
      const m0 = controller.getState().currentMap;
      exploredRef.current = new Uint8Array(m0.width * m0.height);
      controller.render();
      refresh();
    };

    // Record hits/deaths/victory by diffing combatant HP against the last frame.
    const diffCombat = () => {
      const combat = controllerRef.current?.getState().combat;
      if (!combat) return;
      const now = performance.now();
      let foeHit = false;
      let heroHit = false;
      for (const c of combat.combatants) {
        const prevHp = anim.prev.get(c.id);
        if (prevHp !== undefined && c.hp < prevHp) {
          if (c.hp <= 0 && prevHp > 0) anim.deaths.set(c.id, now);
          else anim.hits.set(c.id, now);
          if (c.side === "monster") foeHit = true;
          else heroHit = true;
        }
        anim.prev.set(c.id, c.hp);
      }
      // One impact per side per exchange keeps a multi-monster turn from stacking.
      if (foeHit) sfx.hitMonster();
      if (heroHit) sfx.hitParty();
      if (combat.outcome && !anim.victory) {
        anim.victory = {
          at: now,
          side: combat.outcome === "won" ? "party" : "monster",
        };
        if (combat.outcome === "won") sfx.win();
        else if (combat.outcome === "lost") sfx.lose();
      }
    };

    const resetAnim = () => {
      anim.prev.clear();
      anim.hits.clear();
      anim.deaths.clear();
      anim.victory = null;
    };

    // Drives combat effects each frame; idles (no rAF) whenever nothing animates.
    const loop = () => {
      const controller = controllerRef.current;
      const r = rendererRef.current;
      if (!controller || !r) {
        anim.raf = 0;
        return;
      }
      const now = performance.now();
      for (const [id, t] of anim.hits)
        if (now - t > COMBAT_ANIM.hit) anim.hits.delete(id);
      for (const [id, t] of anim.deaths)
        if (now - t > COMBAT_ANIM.death) anim.deaths.delete(id);

      r.render(controller.getState(), {
        now,
        hits: anim.hits,
        deaths: anim.deaths,
        victory: anim.victory ?? undefined,
      });

      // Once the victory dance has played out, actually resolve the combat.
      if (anim.victory && now - anim.victory.at > COMBAT_ANIM.victory) {
        resetAnim();
        controller.finalizeCombat();
        refresh();
      }

      const busy = anim.hits.size || anim.deaths.size || anim.victory;
      if (controllerRef.current?.getState().mode === "combat" || busy) {
        anim.raf = requestAnimationFrame(loop);
      } else {
        anim.raf = 0;
      }
    };

    const ensureLoop = () => {
      if (!anim.raf) anim.raf = requestAnimationFrame(loop);
    };

    // Explored-world map overlay (opened with M on the overworld).
    const MAP_ZOOMS = [2, 4, 8]; // px per tile
    const drawMap = () => {
      const c = controllerRef.current;
      const r = rendererRef.current;
      const ex = exploredRef.current;
      if (!c || !r || !ex) return;
      const s = c.getState();
      const px = MAP_ZOOMS[mapZoomRef.current] ?? 4;
      const center = {
        x: s.party.position.x + mapPanRef.current.x,
        y: s.party.position.y + mapPanRef.current.y,
      };
      r.renderMap(s, ex, px, center);
    };
    const openMap = () => {
      mapOpenRef.current = true;
      mapPanRef.current = { x: 0, y: 0 };
      setMapOpen(true);
      drawMap();
    };
    const closeMap = () => {
      mapOpenRef.current = false;
      setMapOpen(false);
      controllerRef.current?.render();
    };
    // Handle keys while the map is open (pan / zoom / close). Returns true if
    // the map is open (so it swallows the key).
    const mapKey = (key: string): boolean => {
      if (!mapOpenRef.current) return false;
      if (key === "Escape" || key === "m" || key === "M") {
        closeMap();
        return true;
      }
      let dx = 0;
      let dy = 0;
      if (key === "ArrowLeft" || key === "a" || key === "A") dx = -1;
      else if (key === "ArrowRight" || key === "d" || key === "D") dx = 1;
      else if (key === "ArrowUp" || key === "w" || key === "W") dy = -1;
      else if (key === "ArrowDown" || key === "s" || key === "S") dy = 1;
      if (dx || dy) {
        const step = Math.max(4, Math.round(32 / MAP_ZOOMS[mapZoomRef.current]));
        mapPanRef.current = {
          x: mapPanRef.current.x + dx * step,
          y: mapPanRef.current.y + dy * step,
        };
        drawMap();
        return true;
      }
      if (key === "z" || key === "Z" || key === "+" || key === "=") {
        mapZoomRef.current = (mapZoomRef.current + 1) % MAP_ZOOMS.length;
        drawMap();
        return true;
      }
      if (key === "-" || key === "_") {
        mapZoomRef.current =
          (mapZoomRef.current - 1 + MAP_ZOOMS.length) % MAP_ZOOMS.length;
        drawMap();
        return true;
      }
      return true; // swallow anything else while the map is up
    };

    // Keyboard layer for the sidebar. Returns true when it consumes the key
    // (so it doesn't also move the party). Reads game data live from the
    // controller and UI selection from refs, so nothing is stale.
    const sidebarKey = (key: string): boolean => {
      const c = controllerRef.current;
      if (!c) return false;
      const s = c.getState();

      // Sound toggle works anywhere (music is on M-free: it's a button; the map
      // owns M now).
      if (key === "v" || key === "V") {
        setMuted((v) => {
          const nv = !v;
          if (sfxRef.current) sfxRef.current.enabled = !nv;
          return nv;
        });
        return true;
      }

      // Dialogue.
      if (key === "Escape") {
        if (talkingRef.current) {
          setTalking(false);
          return true;
        }
        return false;
      }
      if (
        (key === "t" || key === "T") &&
        s.locationName &&
        s.mode !== "combat"
      ) {
        if (talkingRef.current) setTalking(false);
        else openTalk();
        return true;
      }

      if (s.mode === "combat") return false; // combat owns its own keys

      // Cycle the selected hero (equip target).
      if (key === "c" || key === "C") {
        const n = s.party.members.length;
        if (n) setSelected((i) => (i + 1) % n);
        return true;
      }

      const inv = s.party.inventory;
      const catalog = menuFor(s);
      const inShopNow = !!s.locationName && catalog.length > 0;
      const { x, y } = s.party.position;
      const tile = s.currentMap.tiles[y * s.currentMap.width + x];
      const station =
        tile?.kind === "station"
          ? stationByXYRef.current.get(`${x},${y}`)
          : undefined;

      // Pack: [ ] pick, G equip onto the selected hero, X sell (in a shop).
      if (inv.length) {
        if (key === "[") {
          setPackSel((i) => (i - 1 + inv.length) % inv.length);
          return true;
        }
        if (key === "]") {
          setPackSel((i) => (i + 1) % inv.length);
          return true;
        }
        if (key === "g" || key === "G") {
          controllerRef.current?.equip(
            selectedRef.current,
            Math.min(packSelRef.current, inv.length - 1),
          );
          refresh();
          return true;
        }
        if ((key === "x" || key === "X") && inShopNow) {
          controllerRef.current?.sell(Math.min(packSelRef.current, inv.length - 1));
          refresh();
          return true;
        }
      }

      // Number keys act on the context's primary list.
      if (/^[1-9]$/.test(key)) {
        const n = Number(key) - 1;
        if (station) {
          const list = allStationsRef.current.filter((st) => st.id !== station.id);
          if (n < list.length) rideTo(list[n]);
          return true; // swallow digits while on a platform
        }
        if (inShopNow) {
          if (n < catalog.length) buy(catalog[n].id);
          return true;
        }
        if (n < s.party.members.length) {
          setSelected(n);
          return true;
        }
        return false;
      }

      return false;
    };

    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      // Let text inputs (the NPC chat) receive keys without moving the party.
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (tag === "BUTTON" && ["Enter", " ", "e", "E"].includes(e.key)) return;
      const controller = controllerRef.current;
      if (!controller) return;
      music.resume(); // unlock/start audio on the first gesture
      // Map overlay swallows keys while open; M opens it on the overworld.
      if (mapKey(e.key)) {
        e.preventDefault();
        return;
      }
      if (
        (e.key === "m" || e.key === "M") &&
        controller.getState().mode === "overworld"
      ) {
        openMap();
        e.preventDefault();
        return;
      }
      if (sidebarKey(e.key)) {
        e.preventDefault();
        return;
      }
      const before = controller.getState();
      const wasCombat = before.mode === "combat";
      const posBefore = before.party.position;
      if (controller.handleKey(e.key)) {
        e.preventDefault();
        const after = controller.getState();
        if (after.mode === "combat") {
          if (!wasCombat) sfx.encounter(); // just got ambushed
          diffCombat();
          ensureLoop();
        } else {
          if (wasCombat) resetAnim(); // left combat by fleeing
          else if (
            after.party.position.x !== posBefore.x ||
            after.party.position.y !== posBefore.y
          )
            sfx.move();
        }
        refresh();
      }
    };
    window.addEventListener("keydown", onKey);

    fetch("/world/berlin-overworld.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("no asset"))))
      .then(async (asset: WorldAsset) => {
        venuesRef.current = venueMap(asset);
        stationByXYRef.current = stationMap(asset);
        allStationsRef.current = stationList(asset);
        setAllStations(allStationsRef.current);
        const base = stateFromAsset(asset);
        const loaded = await loadParty();
        if (loaded) {
          base.party.gold = loaded.gold;
          if (loaded.members.length) base.party.members = loaded.members;
          base.party.inventory = loaded.inventory;
          if (loaded.x >= 0) {
            // Resume an existing save at its saved position.
            base.party.position = { x: loaded.x, y: loaded.y };
            base.party.facing = loaded.facing as Direction;
            base.log = [...base.log, "Loaded your saved game."];
          } else {
            // A freshly created party — keep the world spawn.
            base.log = [...base.log, "Your new party sets out into Berlin."];
          }
        }
        attach(base);
        // Restore saved fog-of-war (merged with the freshly-revealed spawn).
        if (loaded?.explored && exploredRef.current) {
          decodeExplored(loaded.explored, exploredRef.current);
        }
      })
      .catch(() => attach());

    return () => {
      disposed = true;
      window.removeEventListener("keydown", onKey);
      if (anim.raf) cancelAnimationFrame(anim.raf);
      anim.raf = 0;
      music.stop();
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
  const save = async () => {
    const c = controllerRef.current;
    if (!c) return;
    const p = c.getState().party;
    const r = await saveParty({
      x: p.position.x,
      y: p.position.y,
      facing: p.facing,
      gold: p.gold,
      members: p.members,
      inventory: p.inventory,
      explored: exploredRef.current
        ? encodeExplored(exploredRef.current)
        : undefined,
    });
    if (r.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };
  const rideTo = (st: Station) => {
    controllerRef.current?.travelTo(st.x, st.y, st.name);
    refresh();
  };
  const openTalk = () => {
    const s = controllerRef.current?.getState();
    if (!s?.locationName) return;
    const { keeperName } = npcPersona({
      category: s.locationCategory ?? "OTHER",
      venueName: s.locationName,
    });
    setKeeper(keeperName);
    setNpcLog([]);
    setNpcInput("");
    setTalking(true);
  };
  const sendNpc = async () => {
    const text = npcInput.trim();
    if (!text || npcBusy) return;
    const s = controllerRef.current?.getState();
    const history = npcLog;
    setNpcLog([...history, { role: "user", content: text }]);
    setNpcInput("");
    setNpcBusy(true);
    const { reply } = await npcReply({
      category: s?.locationCategory ?? "OTHER",
      venueName: s?.locationName ?? "this place",
      district: s?.locationDistrict,
      cuisine: s?.locationCuisine,
      dishes: s?.locationEats,
      history,
      message: text,
    });
    setNpcLog((l) => [...l, { role: "assistant", content: reply }]);
    setNpcBusy(false);
  };

  // Close the conversation when you leave the venue.
  useEffect(() => {
    if (!hud?.locationName && talking) setTalking(false);
  }, [hud?.locationName, talking]);

  const inShop = !!hud?.locationName && (hud?.shop.length ?? 0) > 0;
  const packSelClamped =
    hud && hud.inventory.length ? Math.min(packSel, hud.inventory.length - 1) : 0;

  // Context-sensitive key hints shown at the top of the sidebar.
  const keyHints = mapOpen
    ? "Map — arrows: pan · Z: zoom · M / Esc: close"
    : hud?.combat
      ? "Arrows / WASD: attack or move a hero · F: flee"
      : talking
        ? "Type your message · Enter: send · Esc: leave"
        : hud?.onStation
          ? "1–9: board that train · step off the platform to cancel"
          : inShop
            ? "1–9: buy · [ ]: pick pack item · G: equip · X: sell · C: switch hero · T: talk · Enter: leave"
            : hud?.locationName
              ? "T: talk to the keeper · Enter: step outside"
              : "Move: WASD / arrows · Enter: enter place · 1–N: hero · [ ] pack · G: equip · M: map · V: sound";

  return (
    <div className="game-screen flex flex-col gap-4 lg:flex-row">
      <canvas
        ref={canvasRef}
        className="rounded-lg border border-neutral-800 bg-black"
        style={{ width: 704, height: 704, imageRendering: "pixelated" }}
        aria-label="Game map"
      />

      <aside className="w-full max-w-sm space-y-4 font-mono text-sm">
        {hud ? (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-2 text-xs leading-snug text-neutral-600">
            <span className="font-semibold uppercase tracking-wide text-neutral-500">
              Keys{" "}
            </span>
            {keyHints}
          </div>
        ) : null}

        {hud?.combat ? (
          <div className="rounded-lg border border-red-300 bg-red-50 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-700">
              Combat
            </div>
            <div className="mb-1 text-xs font-semibold text-neutral-500">
              Enemies
            </div>
            <ul className="mb-2 space-y-1 text-neutral-700">
              {hud.combat.monsters.map((m, i) => (
                <li
                  key={i}
                  className={m.hp <= 0 ? "text-neutral-400 line-through" : ""}
                >
                  {m.name} — {Math.max(0, m.hp)}/{m.maxHp}
                </li>
              ))}
            </ul>
            <div className="mb-1 text-xs font-semibold text-neutral-500">
              Your party
            </div>
            <ul className="space-y-1 text-neutral-700">
              {hud.combat.party.map((p) => (
                <li
                  key={p.id}
                  className={`${p.hp <= 0 ? "text-neutral-400 line-through" : ""} ${
                    p.id === hud.combat!.activeId
                      ? "font-semibold text-amber-700"
                      : ""
                  }`}
                >
                  {p.id === hud.combat!.activeId ? "▸ " : ""}
                  {p.name} — {Math.max(0, p.hp)}/{p.maxHp}
                </li>
              ))}
            </ul>
            <div className="mt-2 max-h-24 overflow-y-auto rounded border border-red-200 bg-white/60 p-2 text-xs text-neutral-700">
              {hud.combat.log.slice(-6).map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              Arrows: move / attack adjacent · F: flee
            </p>
          </div>
        ) : null}

        {!hud?.combat && (
        <div className="rounded-lg border border-neutral-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Party
            </span>
            <span className="flex items-center gap-2">
              {saved ? (
                <span className="text-xs text-green-600">Saved!</span>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  const next = !muted;
                  setMuted(next);
                  if (sfxRef.current) sfxRef.current.enabled = !next;
                }}
                aria-label={muted ? "Unmute sound" : "Mute sound"}
                title={muted ? "Unmute sound" : "Mute sound"}
                className="rounded border border-neutral-300 px-2 py-0.5 text-xs hover:bg-neutral-100"
              >
                {muted ? "🔇" : "🔊"}
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = !musicOff;
                  setMusicOff(next);
                  musicRef.current?.setEnabled(!next);
                }}
                aria-label={musicOff ? "Music off" : "Music on"}
                title={musicOff ? "Music off" : "Music on"}
                className={`rounded border border-neutral-300 px-2 py-0.5 text-xs hover:bg-neutral-100 ${
                  musicOff ? "opacity-40" : ""
                }`}
              >
                🎵
              </button>
              <button
                type="button"
                onClick={save}
                className="rounded border border-neutral-300 px-2 py-0.5 text-xs hover:bg-neutral-100"
              >
                Save
              </button>
              <span className="text-xs text-amber-700">{hud?.gold ?? 0}g</span>
            </span>
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
                    Here: {hud.place.name}
                    {hud.place.stars ? (
                      <span className="text-yellow-500">
                        {" "}
                        {"★".repeat(hud.place.stars)}
                      </span>
                    ) : null}{" "}
                    ({hud.place.cuisine?.length
                      ? hud.place.cuisine.join("/")
                      : hud.place.category.toLowerCase()}
                    {hud.place.priceLevel
                      ? ` · ${"€".repeat(hud.place.priceLevel)}`
                      : ""}
                    ) — press Enter
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
                        <span className="font-semibold">
                          <span className="text-neutral-400">{i + 1}. </span>
                          {m.name}
                        </span>
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
                      <div className="mt-0.5 text-[10px] text-neutral-500">
                        Lv {m.level} · XP {m.xp}/{xpForNextLevel(m.level)}
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
        )}

        {inShop && hud ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
              Shop — {hud.locationName}
            </div>
            {hud.cuisine?.length || hud.price ? (
              <p className="mb-1 text-xs text-neutral-600">
                {hud.cuisine?.length ? hud.cuisine.join("/") : null}
                {hud.price ? (
                  <span className="text-amber-700">
                    {hud.cuisine?.length ? " · " : ""}
                    {"€".repeat(hud.price)}
                  </span>
                ) : null}
              </p>
            ) : null}
            <p className="mb-1 text-xs text-neutral-500">Press 1–9 to buy.</p>
            <ul className="space-y-1 text-neutral-700">
              {hud.shop.map((item, i) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span>
                    {i < 9 ? (
                      <span className="text-neutral-400">{i + 1}. </span>
                    ) : null}
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

        {hud?.locationName && !hud.combat && !talking ? (
          <div className="rounded-lg border border-neutral-200 bg-white p-3">
            <button
              type="button"
              onClick={openTalk}
              className="w-full rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100"
            >
              Talk to the keeper <span className="text-neutral-400">(T)</span>
            </button>
          </div>
        ) : null}

        {talking && hud?.locationName ? (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                Talking to {keeper}
              </span>
              <button
                type="button"
                onClick={() => setTalking(false)}
                className="rounded border border-neutral-300 px-2 py-0.5 text-xs hover:bg-neutral-100"
              >
                Leave
              </button>
            </div>
            <ul className="mb-2 max-h-40 space-y-1 overflow-y-auto text-neutral-700">
              {npcLog.map((m, i) => (
                <li
                  key={i}
                  className={
                    m.role === "user" ? "text-neutral-500" : "text-indigo-800"
                  }
                >
                  {m.role === "user" ? "You: " : `${keeper}: `}
                  {m.content}
                </li>
              ))}
              {npcBusy ? (
                <li className="text-neutral-400">{keeper} is thinking…</li>
              ) : null}
            </ul>
            <div className="flex gap-1">
              <input
                autoFocus
                value={npcInput}
                onChange={(e) => setNpcInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendNpc();
                  else if (e.key === "Escape") {
                    e.currentTarget.blur();
                    setTalking(false);
                  }
                }}
                placeholder="Say something…"
                maxLength={200}
                className="flex-1 rounded border border-neutral-300 px-2 py-1 text-xs"
              />
              <button
                type="button"
                onClick={sendNpc}
                disabled={npcBusy}
                className="rounded border border-neutral-300 px-2 py-0.5 text-xs hover:bg-neutral-100 disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </div>
        ) : null}

        {hud?.onStation && !hud.combat ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-700">
              {hud.onStation.kind}-Bahn · {hud.onStation.name}
            </div>
            <p className="mb-1 text-xs text-neutral-500">
              Board a train to (press 1–9):
            </p>
            <ul className="max-h-48 space-y-1 overflow-y-auto text-neutral-700">
              {allStations
                .filter((st) => st.id !== hud.onStation!.id)
                .map((st, i) => (
                  <li
                    key={st.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span>
                      {i < 9 ? (
                        <span className="text-neutral-400">{i + 1}. </span>
                      ) : null}
                      <span className="text-neutral-400">{st.kind}</span>{" "}
                      {st.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => rideTo(st)}
                      className="rounded border border-neutral-300 px-2 py-0.5 text-xs hover:bg-neutral-100"
                    >
                      Ride
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}

        {hud && !hud.combat && hud.inventory.length > 0 ? (
          <div className="rounded-lg border border-neutral-200 bg-white p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Pack{" "}
              <span className="normal-case text-neutral-400">
                ([ ] pick · G: equip → {hud.members[selected]?.name}
                {inShop ? " · X: sell" : ""})
              </span>
            </div>
            <ul className="space-y-1 text-neutral-700">
              {hud.inventory.map((it, i) => (
                <li
                  key={it.name}
                  onClick={() => setPackSel(i)}
                  className={`flex cursor-pointer items-center justify-between gap-2 rounded px-1 ${
                    i === packSelClamped ? "bg-amber-50 ring-1 ring-amber-300" : ""
                  }`}
                >
                  <span>
                    <span className="text-neutral-400">
                      {i === packSelClamped ? "▶ " : "  "}
                    </span>
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
