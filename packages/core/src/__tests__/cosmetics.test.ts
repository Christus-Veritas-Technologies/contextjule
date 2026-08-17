import { describe, expect, test } from "bun:test";

import {
  COSMETICS,
  cosmeticById,
  earnedCosmetics,
  equippedFromSettings,
  isEarned,
  progressToward,
} from "../cosmetics";
import { EMPTY_STATS, type Stats } from "../stats";

function stats(overrides: Partial<Stats> = {}): Stats {
  return { ...EMPTY_STATS, ...overrides };
}

describe("progressToward", () => {
  test("nothing earned on an empty install", () => {
    expect(earnedCosmetics(EMPTY_STATS)).toEqual([]);
  });

  test("scales linearly to the requirement", () => {
    const wizard = cosmeticById("hat-wizard")!;
    expect(progressToward(wizard, stats({ timeTogetherMs: 25 * 3_600_000 }))).toBeCloseTo(0.5);
    expect(progressToward(wizard, stats({ timeTogetherMs: 50 * 3_600_000 }))).toBe(1);
  });

  test("clamps at full rather than overshooting", () => {
    const wizard = cosmeticById("hat-wizard")!;
    expect(progressToward(wizard, stats({ timeTogetherMs: 5_000 * 3_600_000 }))).toBe(1);
  });

  test("the slowest clause is the real progress", () => {
    // Nothing here has two clauses today, but the rule has to hold if one ever
    // gains a second — otherwise a half-met requirement would read as earned.
    const twoClause = {
      id: "test",
      name: "Test",
      slot: "head" as const,
      requirement: { hours: 10, cleanses: 100 },
      label: "",
      note: "",
    };
    const halfway = stats({ timeTogetherMs: 10 * 3_600_000, cleanses: 0 });
    expect(progressToward(twoClause, halfway)).toBe(0);
    expect(isEarned(twoClause, halfway)).toBe(false);
  });

  test("every cosmetic is reachable and none is free", () => {
    for (const cosmetic of COSMETICS) {
      expect(progressToward(cosmetic, EMPTY_STATS)).toBe(0);
      expect(cosmetic.label.length).toBeGreaterThan(0);
    }
  });

  test("ids are unique", () => {
    expect(new Set(COSMETICS.map((c) => c.id)).size).toBe(COSMETICS.length);
  });
});

describe("equippedFromSettings", () => {
  test("reads one per slot", () => {
    expect(equippedFromSettings({ "wardrobe.head": "hat-wizard" })).toEqual({
      head: "hat-wizard",
    });
  });

  test("ignores an id in the wrong slot", () => {
    // A head slot holding a back item would draw her wearing a rucksack as a
    // hat, which is exactly the kind of thing a stale setting causes.
    expect(equippedFromSettings({ "wardrobe.head": "pack-vault" })).toEqual({});
  });

  test("ignores unknown ids and empty strings", () => {
    expect(equippedFromSettings({ "wardrobe.head": "nonsense" })).toEqual({});
    expect(equippedFromSettings({ "wardrobe.head": "" })).toEqual({});
    expect(equippedFromSettings({})).toEqual({});
  });
});
