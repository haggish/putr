// Movement system. Pure: given a state and a direction, returns the next state
// plus whether the party actually moved (blocked moves still turn to face).

import type { Direction, GameState } from "../types";
import { DIRECTIONS } from "../types";
import { isPassable } from "../world";

export interface StepResult {
  state: GameState;
  moved: boolean;
}

export function step(state: GameState, dir: Direction): StepResult {
  const delta = DIRECTIONS[dir];
  const target = {
    x: state.party.position.x + delta.x,
    y: state.party.position.y + delta.y,
  };

  if (!isPassable(state.currentMap, target)) {
    // Blocked: still update facing so the player can see which way they turned.
    return {
      state: { ...state, party: { ...state.party, facing: dir } },
      moved: false,
    };
  }

  return {
    state: {
      ...state,
      party: { ...state.party, position: target, facing: dir },
    },
    moved: true,
  };
}
