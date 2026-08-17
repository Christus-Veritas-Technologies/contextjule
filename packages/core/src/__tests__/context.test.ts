import { describe, expect, test } from "bun:test";

import {
  LOAD_STATE_SPECS,
  loadStateFor,
  METER_SEGMENTS,
  meterSegments,
  shouldWarn,
  usedFraction,
} from "../context";

describe("loadStateFor", () => {
  // The boundaries are the whole product. Every one is inclusive-lower.
  test.each([
    [0, "fresh"],
    [4_999, "fresh"],
    [5_000, "loaded"],
    [31_999, "loaded"],
    [32_000, "heavy"],
    [127_999, "heavy"],
    [128_000, "crashed"],
    [1_000_000, "crashed"],
  ])("%i tokens is %s", (tokens, expected) => {
    expect(loadStateFor(tokens)).toBe(expected as never);
  });

  test("nonsense input never throws and never lies", () => {
    expect(loadStateFor(-1)).toBe("fresh");
    expect(loadStateFor(Number.NaN)).toBe("fresh");
    expect(loadStateFor(Number.POSITIVE_INFINITY)).toBe("crashed");
  });

  test("the spec ranges are contiguous with no gap or overlap", () => {
    const order = ["fresh", "loaded", "heavy", "crashed"] as const;
    for (let i = 1; i < order.length; i++) {
      expect(LOAD_STATE_SPECS[order[i]!].from).toBe(LOAD_STATE_SPECS[order[i - 1]!].to);
    }
  });
});

describe("meterSegments", () => {
  test("is always the full width", () => {
    expect(meterSegments(0)).toHaveLength(METER_SEGMENTS);
    expect(meterSegments(999_999)).toHaveLength(METER_SEGMENTS);
  });

  test("empty only when genuinely empty", () => {
    expect(meterSegments(0).filter((c) => c.filled)).toHaveLength(0);
  });

  test("one token shows one segment, so a live session never reads as empty", () => {
    // 1/200000 rounds to zero. The floor is what stops the bar lying.
    expect(meterSegments(1).filter((c) => c.filled)).toHaveLength(1);
  });

  test("fills proportionally and clamps at full", () => {
    expect(meterSegments(100_000, 200_000).filter((c) => c.filled)).toHaveLength(7);
    expect(meterSegments(500_000, 200_000).filter((c) => c.filled)).toHaveLength(METER_SEGMENTS);
  });

  test("filled cells wear the state colour, empty cells do not", () => {
    const cells = meterSegments(48_200, 200_000);
    const filled = cells.filter((c) => c.filled);
    expect(filled[0]!.fill).toBe(LOAD_STATE_SPECS.heavy.meter);
    expect(cells.at(-1)!.fill).not.toBe(filled[0]!.fill);
  });

  test("a zero window cannot divide by zero", () => {
    expect(() => meterSegments(1_000, 0)).not.toThrow();
  });
});

describe("usedFraction", () => {
  test("clamps to 0..1", () => {
    expect(usedFraction(-5, 200_000)).toBe(0);
    expect(usedFraction(400_000, 200_000)).toBe(1);
    expect(usedFraction(100_000, 200_000)).toBeCloseTo(0.5);
  });
});

describe("shouldWarn", () => {
  test("fires the highest threshold crossed", () => {
    expect(shouldWarn(190_000, 200_000, [])).toBe(0.9);
    expect(shouldWarn(130_000, 200_000, [])).toBe(0.6);
  });

  test("stays quiet below the first threshold", () => {
    expect(shouldWarn(50_000, 200_000, [])).toBeNull();
  });

  test("says each one once", () => {
    expect(shouldWarn(190_000, 200_000, [0.9])).toBe(0.6);
    expect(shouldWarn(190_000, 200_000, [0.9, 0.6])).toBeNull();
  });
});
