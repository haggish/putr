"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CLASSES,
  makeCharacter,
  RACES,
  type CharacterClass,
  type Race,
} from "@/game";
import { saveParty } from "../actions";

const BASE = 8;
const MAX = 18;
const POOL = 24;
const STATS = ["str", "dex", "int", "wis"] as const;
type StatKey = (typeof STATS)[number];

type Draft = {
  name: string;
  race: Race;
  class: CharacterClass;
  stats: Record<StatKey, number>;
};

const blank = (i: number): Draft => ({
  name: `Adventurer ${i + 1}`,
  race: "HUMAN",
  class: CLASSES[i % CLASSES.length],
  stats: { str: BASE, dex: BASE, int: BASE, wis: BASE },
});

export default function CreatePage() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Draft[]>(() => [0, 1, 2, 3].map(blank));
  const [busy, setBusy] = useState(false);

  const spent = (d: Draft) => STATS.reduce((s, k) => s + d.stats[k] - BASE, 0);
  const remaining = (d: Draft) => POOL - spent(d);

  const setDraft = (i: number, patch: Partial<Draft>) =>
    setDrafts((ds) => ds.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  const bump = (i: number, k: StatKey, delta: number) =>
    setDrafts((ds) =>
      ds.map((d, j) => {
        if (j !== i) return d;
        const v = d.stats[k] + delta;
        if (v < BASE || v > MAX) return d;
        if (delta > 0 && remaining(d) <= 0) return d;
        return { ...d, stats: { ...d.stats, [k]: v } };
      }),
    );

  const begin = async () => {
    setBusy(true);
    const members = drafts.map(makeCharacter);
    // Sentinel position (-1) tells /play this is a new party -> use world spawn.
    await saveParty({
      x: -1,
      y: -1,
      facing: "south",
      gold: 150,
      members,
      inventory: [],
    });
    router.push("/play");
  };

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Create your party</h1>
        <p className="text-neutral-600">
          Four adventurers set out inside the Ring. Name them, choose a race and
          class, and spend {POOL} points across their stats.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {drafts.map((d, i) => (
          <div
            key={i}
            className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4"
          >
            <input
              value={d.name}
              onChange={(e) => setDraft(i, { name: e.target.value })}
              maxLength={20}
              placeholder="Name"
              className="w-full rounded border border-neutral-300 px-2 py-1 text-sm"
            />
            <div className="flex gap-2">
              <select
                value={d.race}
                onChange={(e) => setDraft(i, { race: e.target.value as Race })}
                className="flex-1 rounded border border-neutral-300 px-2 py-1 text-sm capitalize"
              >
                {RACES.map((r) => (
                  <option key={r} value={r}>
                    {r.toLowerCase()}
                  </option>
                ))}
              </select>
              <select
                value={d.class}
                onChange={(e) =>
                  setDraft(i, { class: e.target.value as CharacterClass })
                }
                className="flex-1 rounded border border-neutral-300 px-2 py-1 text-sm capitalize"
              >
                {CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {c.toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              {STATS.map((k) => (
                <div
                  key={k}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="uppercase text-neutral-500">{k}</span>
                  <span className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => bump(i, k, -1)}
                      className="h-6 w-6 rounded border border-neutral-300 hover:bg-neutral-100"
                    >
                      -
                    </button>
                    <span className="w-6 text-center tabular-nums">
                      {d.stats[k]}
                    </span>
                    <button
                      type="button"
                      onClick={() => bump(i, k, 1)}
                      className="h-6 w-6 rounded border border-neutral-300 hover:bg-neutral-100"
                    >
                      +
                    </button>
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-neutral-500">
              Points left:{" "}
              <span
                className={remaining(d) === 0 ? "text-green-600" : "text-amber-700"}
              >
                {remaining(d)}
              </span>
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={begin}
          disabled={busy}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {busy ? "Starting…" : "Begin adventure →"}
        </button>
        <Link
          href="/play"
          className="text-sm text-neutral-500 hover:text-neutral-800"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}
