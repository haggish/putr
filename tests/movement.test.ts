import { describe, it, expect } from "vitest";
import { createInitialState, step, type GameMap, type Tile } from "@/game";

const baseState = (map: GameMap) => {
  const base = createInitialState();
  return {
    ...base,
    currentMap: map,
    party: { ...base.party, position: { x: 0, y: 0 } },
    log: [] as string[],
  };
};

describe("movement district messages", () => {
  it("announces crossing into a new, named district (only on the crossing)", () => {
    const tiles: Tile[] = [
      { kind: "street", district: "Mitte" },
      { kind: "street", district: "Mitte" },
      { kind: "street", district: "Kreuzberg" },
    ];
    const s0 = baseState({ id: "t", width: 3, height: 1, tiles });

    const r1 = step(s0, "east"); // Mitte -> Mitte: no message
    expect(r1.moved).toBe(true);
    expect(r1.state.log).toEqual([]);

    const r2 = step(r1.state, "east"); // Mitte -> Kreuzberg: message
    expect(r2.moved).toBe(true);
    expect(r2.state.log.at(-1)).toBe("You cross into Kreuzberg.");
  });

  it("stays quiet when moving into an area with no district", () => {
    const tiles: Tile[] = [
      { kind: "street", district: "Mitte" },
      { kind: "street" },
    ];
    const s0 = baseState({ id: "t", width: 2, height: 1, tiles });
    const r = step(s0, "east");
    expect(r.state.log).toEqual([]);
  });
});