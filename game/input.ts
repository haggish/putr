// Keyboard mapping. Pure (takes a key string), so it is testable without a DOM
// and reusable by any input adapter.

import type { Direction } from "./types";

/** Map a KeyboardEvent.key to a movement direction (arrow keys + WASD). */
export function keyToDirection(key: string): Direction | undefined {
  switch (key) {
    case "ArrowUp":
    case "w":
    case "W":
      return "north";
    case "ArrowDown":
    case "s":
    case "S":
      return "south";
    case "ArrowLeft":
    case "a":
    case "A":
      return "west";
    case "ArrowRight":
    case "d":
    case "D":
      return "east";
    default:
      return undefined;
  }
}
