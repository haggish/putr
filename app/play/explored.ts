// Compact persistence for the fog-of-war exploration grid. The grid is one
// byte (0/1) per overworld tile (~74k for the Ring); bit-packing to one bit per
// tile and base64-encoding gets a fully-explored world down to ~12KB, small
// enough to live in the save's `flags` JSON.

/** Bit-pack a 0/1 exploration grid and base64-encode it. */
export function encodeExplored(ex: Uint8Array): string {
  const bytes = new Uint8Array((ex.length + 7) >> 3);
  for (let i = 0; i < ex.length; i++) {
    if (ex[i]) bytes[i >> 3] |= 1 << (i & 7);
  }
  let bin = "";
  const CHUNK = 0x8000; // stay under the argument-count limit for fromCharCode
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

/** Decode a base64 grid, OR-ing set bits into `target` (never clears a tile),
 *  so it merges with whatever is already revealed. */
export function decodeExplored(b64: string, target: Uint8Array): void {
  let bin: string;
  try {
    bin = atob(b64);
  } catch {
    return; // corrupt/foreign payload — ignore rather than throw
  }
  const n = Math.min(target.length, bin.length * 8);
  for (let i = 0; i < n; i++) {
    if ((bin.charCodeAt(i >> 3) >> (i & 7)) & 1) target[i] = 1;
  }
}