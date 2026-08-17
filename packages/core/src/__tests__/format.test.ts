import { describe, expect, test } from "bun:test";

import { formatDuration, formatHours, formatTokens, formatTokensExact } from "../format";

describe("formatTokens", () => {
  test.each([
    [0, "0"],
    [999, "999"],
    [1_000, "1.0k"],
    [48_200, "48.2k"],
    [121_400, "121k"],
    [1_400_000, "1.4M"],
  ])("%i reads as %s", (tokens, expected) => {
    expect(formatTokens(tokens)).toBe(expected);
  });

  test("a bad reading shows a dash rather than NaN", () => {
    expect(formatTokens(Number.NaN)).toBe("—");
    expect(formatTokens(-1)).toBe("—");
  });
});

describe("formatTokensExact", () => {
  test("groups, because it is the one place the real number is shown", () => {
    expect(formatTokensExact(42_180)).toBe("42,180");
  });
});

describe("durations", () => {
  test.each([
    [0, "0m"],
    [60_000, "1m"],
    [72 * 60_000, "1h 12m"],
  ])("%i ms reads as %s", (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });

  test("pluralises hours", () => {
    expect(formatHours(3_600_000)).toBe("1 hour");
    expect(formatHours(104 * 3_600_000)).toBe("104 hours");
  });
});
