/**
 * What she does as the context window moves under her.
 *
 * Without this she teleports: one tick she is standing tall in `state-fresh`,
 * the next she is bent double in `state-heavy`, with nothing in between. The
 * poses are all correct and the whole thing still reads as broken, because a
 * character that changes shape between frames does not look like a character.
 *
 * So every crossing gets a beat. Going up she reacts to the weight; coming down
 * she reacts to the relief; and the resting pose only takes over once that beat
 * has played and she has settled. Crossing several bands at once — a paste that
 * takes her from fresh to heavy in one reading — plays the reaction for where
 * she LANDED, not one per band, because four animations queued back to back is
 * not a transition, it is a cutscene.
 *
 * Pure, like everything else in here: the caller ticks it and renders what it
 * says.
 */
import { LOAD_STATES, type LoadState } from "./context";
import type { ReactionId } from "./reactions";

/** Ordered light to heavy, so a crossing has a direction. */
const ORDER: readonly LoadState[] = LOAD_STATES;

function rank(state: LoadState): number {
  const index = ORDER.indexOf(state);
  return index === -1 ? 0 : index;
}

export type TransitionDirection = "up" | "down" | "none";

export interface Transition {
  readonly from: LoadState;
  readonly to: LoadState;
  readonly direction: TransitionDirection;
  /** How many bands were crossed. Always positive. */
  readonly distance: number;
  /** The reaction to play, or null when the crossing does not deserve one. */
  readonly reaction: ReactionId | null;
}

/**
 * The beat for one crossing.
 *
 * Upward:
 *   into crashed    `crash` — she goes down, and the crashed pose holds after.
 *   anything else   `nudge` — a short shoulder-roll under the new weight.
 *
 * Downward:
 *   all the way to fresh from heavy or crashed   `cheer` — this is the cleanse
 *                                                landing, the moment the whole
 *                                                product exists for.
 *   anything else                                `stretch` — relief, quieter.
 *
 * A drop of one band from `loaded` to `fresh` gets `stretch` rather than
 * `cheer` on purpose. A small drift down is not a victory, and treating it like
 * one would make the real cleanse mean nothing.
 */
export function transitionFor(from: LoadState, to: LoadState): Transition {
  const before = rank(from);
  const after = rank(to);
  const distance = Math.abs(after - before);

  if (distance === 0) {
    return { from, to, direction: "none", distance: 0, reaction: null };
  }

  if (after > before) {
    return {
      from,
      to,
      direction: "up",
      distance,
      reaction: to === "crashed" ? "crash" : "nudge",
    };
  }

  const bigRelief = to === "fresh" && (from === "heavy" || from === "crashed");
  return {
    from,
    to,
    direction: "down",
    distance,
    reaction: bigRelief ? "cheer" : "stretch",
  };
}

/**
 * How long to ignore further crossings after one fires.
 *
 * A token count sitting exactly on a boundary flickers — 31,998 then 32,004
 * then 31,999 — and without this she would twitch between `nudge` and `stretch`
 * forever. Slightly longer than the longest transition reaction, so a beat
 * always finishes before another can start.
 */
export const TRANSITION_COOLDOWN_MS = 1_800;

/**
 * Hysteresis on the reading itself.
 *
 * The cooldown above stops rapid flapping; this stops slow flapping. A count
 * hovering on a threshold has to move this far past it before the crossing is
 * believed, so drifting back and forth across 32,000 for ten minutes produces
 * one transition rather than forty.
 *
 * Expressed as a fraction of the band being entered rather than a flat number
 * of tokens, because the bands are wildly different sizes: 3% of the 5k→32k
 * band is 810 tokens, 3% of 32k→128k is nearly 3,000, and both feel the same
 * to whoever is watching.
 */
export const TRANSITION_MARGIN = 0.03;

export interface TransitionGate {
  /** The state she is currently drawn as. */
  readonly current: LoadState;
  /** When the last transition fired, or null if none has. */
  readonly lastFiredAt: number | null;
}

/**
 * Whether a new reading should actually change her state.
 *
 * Returns the transition to play, or null to hold where she is. Kept separate
 * from `transitionFor` so the decision of *whether* to move and the choice of
 * *what to play* can be tested independently — and so a caller that already
 * knows a crossing is real can skip straight to the second.
 */
export function gateTransition(
  gate: TransitionGate,
  next: LoadState,
  now: number,
): Transition | null {
  if (next === gate.current) return null;
  if (gate.lastFiredAt !== null && now - gate.lastFiredAt < TRANSITION_COOLDOWN_MS) return null;
  return transitionFor(gate.current, next);
}
