import { describe, it, expect } from "vitest";
import {
  buildInterior,
  createInitialState,
  enterInterior,
  exitInterior,
  isPassable,
  keeperSprite,
  step,
  tileAt,
  SPRITES,
  type VenueInfo,
} from "@/game";

const venue: VenueInfo = {
  id: "node/42",
  name: "Test Bar",
  category: "BAR",
  x: 5,
  y: 5,
};

describe("interiors", () => {
  it("builds a walled room with a reachable door", () => {
    const m = buildInterior(venue);
    expect(m.width).toBe(13);
    expect(m.height).toBe(11);
    expect(tileAt(m, { x: 0, y: 0 })!.kind).toBe("building"); // wall
    const cx = Math.floor(m.width / 2);
    expect(tileAt(m, { x: cx, y: m.height - 1 })!.kind).toBe("venue"); // door
    expect(isPassable(m, { x: cx, y: m.height - 2 })).toBe(true); // spawn floor
  });

  it("enters and exits, restoring the overworld position", () => {
    const base = createInitialState();
    base.party.position = { x: 5, y: 5 };

    const inside = enterInterior(base, venue);
    expect(inside.mode).toBe("interior");
    expect(inside.currentMap.id).toBe("interior:node/42");
    expect(inside.locationName).toBe("Test Bar");
    expect(inside.returnTo?.position).toEqual({ x: 5, y: 5 });

    const outside = exitInterior(inside);
    expect(outside.mode).toBe("overworld");
    expect(outside.party.position).toEqual({ x: 5, y: 5 });
    expect(outside.returnTo).toBeUndefined();
    expect(outside.locationName).toBeUndefined();
    expect(outside.keeper).toBeUndefined();
  });

  it("stands a keeper behind the counter that blocks the party", () => {
    const base = createInitialState();
    base.party.position = { x: 5, y: 5 };
    const inside = enterInterior(base, venue);

    const k = inside.keeper!;
    expect(k.x).toBe(Math.floor(inside.currentMap.width / 2));
    expect(k.y).toBe(1);
    expect(k.sprite).toBe("bartender"); // a bar's keeper looks the part
    // A counter tile sits directly in front of (below) the keeper.
    expect(tileAt(inside.currentMap, { x: k.x, y: k.y + 1 })!.kind).toBe("building");

    // Walking into the keeper is blocked — you can't stand on the shop owner.
    const beside = {
      ...inside,
      party: { ...inside.party, position: { x: k.x - 1, y: k.y } },
    };
    const r = step(beside, "east");
    expect(r.moved).toBe(false);
    expect(r.state.party.position).toEqual({ x: k.x - 1, y: k.y });
  });

  it("gives each trade its own keeper sprite that exists in the atlas", () => {
    const trades: [string, string][] = [
      ["BAR", "bartender"],
      ["RESTAURANT", "cook"],
      ["SPAETI", "spaeti"],
      ["CLOTHING", "clerk"],
      ["SPORT", "trainer"],
      ["ARMOURY", "smith"],
      ["GROCERY", "keeper"],
      ["OTHER", "keeper"],
    ];
    for (const [category, sprite] of trades) {
      expect(keeperSprite(category)).toBe(sprite);
      expect(SPRITES[sprite]).toBeDefined();
    }
  });
});
