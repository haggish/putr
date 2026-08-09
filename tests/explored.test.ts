import { describe, it, expect } from "vitest";
import { encodeExplored, decodeExplored } from "@/app/play/explored";

describe("explored (fog-of-war persistence)", () => {
  it("round-trips a grid through base64 bit-packing", () => {
    const src = new Uint8Array(1000);
    for (const i of [0, 1, 7, 8, 9, 63, 64, 500, 999]) src[i] = 1;

    const out = new Uint8Array(1000);
    decodeExplored(encodeExplored(src), out);
    expect(Array.from(out)).toEqual(Array.from(src));
  });

  it("merges (OR) into the target rather than clearing it", () => {
    const saved = new Uint8Array(64);
    saved[10] = 1;
    const target = new Uint8Array(64);
    target[20] = 1; // freshly revealed before decode

    decodeExplored(encodeExplored(saved), target);
    expect(target[10]).toBe(1); // from the save
    expect(target[20]).toBe(1); // preserved
  });

  it("packs a fully-explored world into a few KB", () => {
    const full = new Uint8Array(324 * 229).fill(1);
    expect(encodeExplored(full).length).toBeLessThan(15000);
  });

  it("ignores a corrupt payload without throwing", () => {
    const target = new Uint8Array(8);
    target[0] = 1;
    expect(() => decodeExplored("!!!not base64!!!", target)).not.toThrow();
    expect(target[0]).toBe(1);
  });
});