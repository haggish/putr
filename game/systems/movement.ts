// Movement system. Pure: given a state and a direction, returns the next state
// plus whether the party actually moved (blocked moves still turn to face).

import type { Direction, GameState } from "../types";
import { DIRECTIONS } from "../types";
import { isPassable, tileAt } from "../world";

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

  const onKeeper =
    state.keeper?.x === target.x && state.keeper?.y === target.y;
  if (!isPassable(state.currentMap, target) || onKeeper) {
    // Blocked (a wall, or the keeper standing there): still update facing so the
    // player can see which way they turned.
    return {
      state: { ...state, party: { ...state.party, facing: dir } },
      moved: false,
    };
  }

  // Announce crossing into a new, named district (overworld only — interior
  // tiles carry no district).
  const fromDistrict = tileAt(state.currentMap, state.party.position)?.district;
  const toDistrict = tileAt(state.currentMap, target)?.district;
  const log =
    toDistrict && toDistrict !== fromDistrict
      ? [...state.log, `You cross into ${toDistrict}.`].slice(-8)
      : state.log;

  return {
    state: {
      ...state,
      party: { ...state.party, position: target, facing: dir },
      log,
    },
    moved: true,
  };
}
