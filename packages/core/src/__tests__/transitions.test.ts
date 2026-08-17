import { describe, expect, it } from "bun:test";

import { REACTION_SETTLE_MS, REACTION_SPECS, reactionActive, reactionSettling } from "../reactions";
import {
  gateTransition,
  TRANSITION_COOLDOWN_MS,
  transitionFor,
  type TransitionGate,
} from "../transitions";

/**
 * The failure these guard against is not a crash — it is her twitching. A
 * token count sitting on a band boundary flickers by a few tokens either way,
 * and the naive version fires a fresh animation on every one of those readings.
 */

describe("transitionFor", () => {
  it("plays nothing when nothing changed", () => {
    const held = transitionFor("loaded", "loaded");
    expect(held.direction).toBe("none");
    expect(held.reaction).toBeNull();
  });

  it("rolls a shoulder going up a band", () => {
    expect(transitionFor("fresh", "loaded").reaction).toBe("nudge");
    expect(transitionFor("loaded", "heavy").reaction).toBe("nudge");
  });

  it("goes down properly on the way into crashed", () => {
    expect(transitionFor("heavy", "crashed").reaction).toBe("crash");
    // Straight from fresh to crashed is still one crash, not three animations.
    expect(transitionFor("fresh", "crashed").reaction).toBe("crash");
    expect(transitionFor("fresh", "crashed").distance).toBe(3);
  });

  it("cheers only for a real cleanse", () => {
    expect(transitionFor("crashed", "fresh").reaction).toBe("cheer");
    expect(transitionFor("heavy", "fresh").reaction).toBe("cheer");
  });

  it("does not cheer a small drift down", () => {
    // Treating a one-band drift as a victory would make the real cleanse mean
    // nothing.
    expect(transitionFor("loaded", "fresh").reaction).toBe("stretch");
    expect(transitionFor("crashed", "heavy").reaction).toBe("stretch");
  });

  it("reports direction and distance for every pair", () => {
    expect(transitionFor("fresh", "heavy")).toMatchObject({ direction: "up", distance: 2 });
    expect(transitionFor("crashed", "loaded")).toMatchObject({ direction: "down", distance: 2 });
  });

  it("only ever names a reaction that exists", () => {
    const states = ["fresh", "loaded", "heavy", "crashed"] as const;
    for (const from of states) {
      for (const to of states) {
        const { reaction } = transitionFor(from, to);
        if (reaction) expect(REACTION_SPECS[reaction]).toBeDefined();
      }
    }
  });
});

describe("gateTransition", () => {
  const T0 = 1_700_000_000_000;

  it("fires on a genuine crossing", () => {
    const gate: TransitionGate = { current: "fresh", lastFiredAt: null };
    expect(gateTransition(gate, "loaded", T0)?.reaction).toBe("nudge");
  });

  it("holds when the state has not changed", () => {
    const gate: TransitionGate = { current: "loaded", lastFiredAt: null };
    expect(gateTransition(gate, "loaded", T0)).toBeNull();
  });

  it("swallows a second crossing inside the cooldown", () => {
    // 31,998 → 32,004 → 31,999 must not produce nudge, stretch, nudge.
    const gate: TransitionGate = { current: "heavy", lastFiredAt: T0 };
    expect(gateTransition(gate, "loaded", T0 + 500)).toBeNull();
    expect(gateTransition(gate, "loaded", T0 + TRANSITION_COOLDOWN_MS - 1)).toBeNull();
  });

  it("allows the next one the instant the cooldown is up", () => {
    const gate: TransitionGate = { current: "heavy", lastFiredAt: T0 };
    expect(gateTransition(gate, "loaded", T0 + TRANSITION_COOLDOWN_MS)?.reaction).toBe("stretch");
  });

  it("outlasts the longest transition reaction, so a beat always completes", () => {
    const longest = Math.max(
      ...(["nudge", "crash", "cheer", "stretch"] as const).map(
        (id) => REACTION_SPECS[id].durationMs + REACTION_SETTLE_MS,
      ),
    );
    expect(TRANSITION_COOLDOWN_MS).toBeGreaterThanOrEqual(longest);
  });
});

describe("settling", () => {
  const T0 = 1_700_000_000_000;
  const started = { id: "nudge", startedAt: T0 } as const;
  const duration = REACTION_SPECS.nudge.durationMs;

  it("is not settling while the strip is still playing", () => {
    expect(reactionActive(started, T0 + duration - 1)).toBe(true);
    expect(reactionSettling(started, T0 + duration - 1)).toBe(false);
  });

  it("settles for exactly the breath after it ends", () => {
    expect(reactionSettling(started, T0 + duration)).toBe(true);
    expect(reactionSettling(started, T0 + duration + REACTION_SETTLE_MS - 1)).toBe(true);
    expect(reactionSettling(started, T0 + duration + REACTION_SETTLE_MS)).toBe(false);
  });

  it("never settles a sustained reaction, because it has not finished", () => {
    const held = { id: "held", startedAt: T0 } as const;
    expect(reactionActive(held, T0 + 60_000)).toBe(true);
    expect(reactionSettling(held, T0 + 60_000)).toBe(false);
  });

  it("hands back to the resting pose with no gap", () => {
    // Active, then settling, then neither — and never both, or two poses would
    // be drawn on the same tick.
    for (let t = 0; t <= duration + REACTION_SETTLE_MS + 50; t += 25) {
      const active = reactionActive(started, T0 + t);
      const settle = reactionSettling(started, T0 + t);
      expect(active && settle).toBe(false);
    }
  });
});
