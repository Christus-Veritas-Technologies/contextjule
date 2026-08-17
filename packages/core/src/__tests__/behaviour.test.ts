import { describe, expect, test } from "bun:test";

import { CLEANSED_HOLD_MS, SLEEP_AFTER_MS, NAP_AFTER_MS } from "../activity";
import { decideJule, DEFAULT_NUDGES, type JuleInput } from "../behaviour";

const NOW = 1_000_000_000;

function input(overrides: Partial<JuleInput> = {}): JuleInput {
  return {
    now: NOW,
    tokens: 40_000,
    windowSize: 200_000,
    sessionStartedAt: NOW - 60_000,
    lastInputAt: null,
    streaming: false,
    awaitingModel: false,
    lastActivityAt: NOW,
    cleansedAt: null,
    warnedAt: [0.6, 0.9],
    hydratedAt: [1, 2, 3],
    justOpened: false,
    reaction: null,
    nudges: DEFAULT_NUDGES,
    ...overrides,
  };
}

describe("precedence", () => {
  test("a cleanse outranks everything for its hold", () => {
    const out = decideJule(input({ cleansedAt: NOW - 100, streaming: true, tokens: 190_000 }));
    expect(out.activity).toBe("cleansed");
  });

  test("and stops outranking once the hold is over", () => {
    const out = decideJule(input({ cleansedAt: NOW - CLEANSED_HOLD_MS - 1, streaming: true }));
    expect(out.activity).toBe("streaming");
  });

  test("sleep beats a live session", () => {
    const out = decideJule(input({ lastActivityAt: NOW - SLEEP_AFTER_MS - 1, streaming: true }));
    expect(out.activity).toBe("asleep");
  });

  test("sleep is skippable when the nudge is off", () => {
    const out = decideJule(
      input({
        lastActivityAt: NOW - SLEEP_AFTER_MS - 1,
        streaming: true,
        nudges: { ...DEFAULT_NUDGES, sleep: false },
      }),
    );
    expect(out.activity).toBe("streaming");
  });

  test("overload outranks streaming near the ceiling", () => {
    // At 90% the warning is the message, not the fact that tokens are arriving.
    const out = decideJule(input({ tokens: 185_000, streaming: true }));
    expect(out.activity).toBe("overload");
  });

  test("typing reads as listening", () => {
    expect(decideJule(input({ lastInputAt: NOW - 500 })).activity).toBe("listening");
    expect(decideJule(input({ lastInputAt: NOW - 60_000 })).activity).toBe("idle");
  });

  test("no session means idle, never asleep by accident", () => {
    expect(decideJule(input({ tokens: null })).activity).toBe("idle");
  });
});

describe("the sprite action", () => {
  test("standing still wears the load state", () => {
    expect(decideJule(input({ tokens: 40_000 })).action).toBe("state-heavy");
    expect(decideJule(input({ tokens: 1_000 })).action).toBe("state-fresh");
  });

  test("she naps before she sleeps", () => {
    const napping = decideJule(input({ lastActivityAt: NOW - NAP_AFTER_MS - 1 }));
    expect(napping.action).toBe("nap");
    // The bar still says idle — nap is a pose, not an activity.
    expect(napping.activity).toBe("idle");
  });

  test("a reaction overrides the pose and says so", () => {
    const out = decideJule(input({ reaction: { id: "boop", startedAt: NOW - 100 } }));
    expect(out.action).toBe("boop");
    expect(out.reacting).toBe(true);
    // Everything underneath carries on unchanged.
    expect(out.load).toBe("heavy");
  });

  test("an expired reaction stops overriding", () => {
    const out = decideJule(input({ reaction: { id: "boop", startedAt: NOW - 60_000 } }));
    expect(out.reacting).toBe(false);
    expect(out.action).toBe("state-heavy");
  });

  test("a sustained reaction never expires on its own", () => {
    const out = decideJule(input({ reaction: { id: "held", startedAt: NOW - 600_000 } }));
    expect(out.reacting).toBe(true);
    expect(out.action).toBe("held");
  });
});

describe("speech", () => {
  test("warns once per threshold", () => {
    expect(decideJule(input({ tokens: 130_000, warnedAt: [] })).speech?.reason).toBe("warning");
    expect(decideJule(input({ tokens: 130_000, warnedAt: [0.6] })).speech).toBeNull();
  });

  test("stays silent when warnings are off", () => {
    expect(
      decideJule(
        input({ tokens: 130_000, warnedAt: [], nudges: { ...DEFAULT_NUDGES, warnings: false } }),
      ).speech,
    ).toBeNull();
  });

  test("does not talk in her sleep", () => {
    const out = decideJule(
      input({ tokens: 190_000, warnedAt: [], lastActivityAt: NOW - SLEEP_AFTER_MS - 1 }),
    );
    expect(out.speech).toBeNull();
  });

  test("greets on open when rituals are on, and not when off", () => {
    expect(decideJule(input({ justOpened: true })).speech?.reason).toBe("ritual");
    expect(
      decideJule(input({ justOpened: true, nudges: { ...DEFAULT_NUDGES, rituals: false } })).speech,
    ).toBeNull();
  });

  test("suggests a break after two hours, once", () => {
    const twoHours = input({ sessionStartedAt: NOW - 2 * 60 * 60 * 1000 - 1, hydratedAt: [] });
    expect(decideJule(twoHours).speech?.reason).toBe("hydration");
    expect(decideJule({ ...twoHours, hydratedAt: [1] }).speech).toBeNull();
  });
});
