import { describe, it, expect } from "vitest";
import {
  buildInterior,
  createInitialState,
  enterInterior,
  exitInterior,
  isPassable,
  tileAt,
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
  });
});
