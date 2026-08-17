import { describe, expect, it } from "bun:test";

import { RateLimiter } from "../lib/rate-limit";

/**
 * Every test passes `now` explicitly. A limiter tested against the wall clock
 * either sleeps for a real window — which makes the suite slow enough that
 * nobody runs it — or asserts nothing about the rollover, which is the only
 * interesting part.
 */
const T0 = 1_700_000_000_000;

describe("RateLimiter", () => {
  it("allows exactly the limit inside one window", () => {
    const limiter = new RateLimiter(3, 60_000);
    expect(limiter.check("a", T0).allowed).toBe(true);
    expect(limiter.check("a", T0 + 1).allowed).toBe(true);
    expect(limiter.check("a", T0 + 2).allowed).toBe(true);
    expect(limiter.check("a", T0 + 3).allowed).toBe(false);
  });

  it("counts down remaining and reports it as zero once exhausted", () => {
    const limiter = new RateLimiter(2, 60_000);
    expect(limiter.check("a", T0).remaining).toBe(1);
    expect(limiter.check("a", T0).remaining).toBe(0);
    expect(limiter.check("a", T0).remaining).toBe(0);
  });

  it("keeps keys apart", () => {
    const limiter = new RateLimiter(1, 60_000);
    expect(limiter.check("a", T0).allowed).toBe(true);
    expect(limiter.check("b", T0).allowed).toBe(true);
    expect(limiter.check("a", T0).allowed).toBe(false);
  });

  it("opens a fresh window at the reset instant, not a millisecond after", () => {
    const limiter = new RateLimiter(1, 60_000);
    const first = limiter.check("a", T0);
    expect(first.resetAt).toBe(T0 + 60_000);
    expect(limiter.check("a", T0 + 59_999).allowed).toBe(false);
    expect(limiter.check("a", T0 + 60_000).allowed).toBe(true);
  });

  it("does not extend the window on a blocked request", () => {
    // A sliding reset would let a caller who keeps hammering lock themselves
    // out forever, which punishes a retry loop far harder than intended.
    const limiter = new RateLimiter(1, 60_000);
    limiter.check("a", T0);
    const blocked = limiter.check("a", T0 + 30_000);
    expect(blocked.resetAt).toBe(T0 + 60_000);
  });

  it("sweeps expired windows once the map grows past the threshold", () => {
    const limiter = new RateLimiter(1, 1_000);
    for (let i = 0; i < 600; i += 1) limiter.check(`key-${i}`, T0);
    expect(limiter.size).toBeGreaterThan(512);

    // One write well past every existing window triggers the sweep.
    limiter.check("trigger", T0 + 10_000);
    expect(limiter.size).toBe(1);
  });

  it("does not sweep windows that are still live", () => {
    const limiter = new RateLimiter(1, 60_000);
    for (let i = 0; i < 600; i += 1) limiter.check(`key-${i}`, T0);
    limiter.check("trigger", T0 + 1);
    expect(limiter.size).toBe(601);
  });

  it("clears", () => {
    const limiter = new RateLimiter(1, 60_000);
    limiter.check("a", T0);
    limiter.clear();
    expect(limiter.check("a", T0).allowed).toBe(true);
  });
});
