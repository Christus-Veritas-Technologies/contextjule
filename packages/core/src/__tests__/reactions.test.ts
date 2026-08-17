import { describe, expect, test } from "bun:test";

import { REACTION_SPECS, reactionActive, shouldReplace } from "../reactions";

const NOW = 500_000;

describe("reactionActive", () => {
  test("null is never active", () => {
    expect(reactionActive(null, NOW)).toBe(false);
  });

  test("a one-shot expires on its own duration", () => {
    const boop = { id: "boop" as const, startedAt: NOW };
    expect(reactionActive(boop, NOW + REACTION_SPECS.boop.durationMs - 1)).toBe(true);
    expect(reactionActive(boop, NOW + REACTION_SPECS.boop.durationMs)).toBe(false);
  });

  test("a sustained one waits to be told", () => {
    expect(reactionActive({ id: "held", startedAt: NOW }, NOW + 10 ** 7)).toBe(true);
  });
});

describe("shouldReplace", () => {
  test("anything replaces nothing", () => {
    expect(shouldReplace(null, "sip", NOW)).toBe(true);
  });

  test("a dump is never cut short by a boop", () => {
    expect(shouldReplace({ id: "dump", startedAt: NOW }, "boop", NOW + 10)).toBe(false);
  });

  test("but a boop interrupts a sip, which is the point", () => {
    expect(shouldReplace({ id: "sip", startedAt: NOW }, "boop", NOW + 10)).toBe(true);
  });

  test("equal priority replaces, so repeating a boop restarts it", () => {
    expect(shouldReplace({ id: "boop", startedAt: NOW }, "boop", NOW + 10)).toBe(true);
  });

  test("an expired reaction blocks nothing", () => {
    expect(shouldReplace({ id: "dump", startedAt: NOW }, "sip", NOW + 60_000)).toBe(true);
  });

  test("dragging outranks every one-shot", () => {
    for (const id of ["boop", "cheer", "dump", "crash"] as const) {
      expect(REACTION_SPECS.held.priority).toBeGreaterThan(REACTION_SPECS[id].priority);
    }
  });
});
