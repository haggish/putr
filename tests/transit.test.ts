import { describe, it, expect } from "vitest";
import {
  mapFromAsset,
  stationList,
  stationMap,
  tileAt,
  type WorldAsset,
} from "@/game";

const asset: WorldAsset = {
  id: "t",
  width: 3,
  height: 1,
  tiles: ".s.",
  spawn: { x: 0, y: 0 },
  stations: [{ id: "n/1", name: "Ringbahnhof", x: 1, y: 0, kind: "U" }],
};

describe("transit", () => {
  it("decodes a station tile from the asset", () => {
    const m = mapFromAsset(asset);
    expect(tileAt(m, { x: 1, y: 0 })!.kind).toBe("station");
    expect(tileAt(m, { x: 0, y: 0 })!.kind).toBe("street");
  });

  it("lists stations and looks them up by tile key", () => {
    expect(stationList(asset)).toHaveLength(1);
    expect(stationMap(asset).get("1,0")?.name).toBe("Ringbahnhof");
    expect(stationMap(asset).get("0,0")).toBeUndefined();
  });
});
