import { describe, expect, test } from "bun:test";

import { PATROL_DEFAULTS, patrolAt, patrolDuration } from "../patrol";

const { walkMs, settleMs, waveMs } = PATROL_DEFAULTS;

describe("patrolDuration", () => {
  test("is one there-and-back", () => {
    expect(patrolDuration()).toBe((walkMs + settleMs + waveMs) * 2);
  });
});

describe("patrolAt", () => {
  test("opens walking from the left", () => {
    const state = patrolAt(0);
    expect(state.phase).toBe("walk-out");
    expect(state.action).toBe("walk");
    expect(state.position).toBe(0);
    expect(state.mirrored).toBe(false);
  });

  test("arrives at the far end before waving", () => {
    const arriving = patrolAt(walkMs - 1);
    expect(arriving.position).toBeGreaterThan(0.99);

    const settled = patrolAt(walkMs + 10);
    expect(settled.phase).toBe("settle-out");
    expect(settled.action).toBe("idle");
    expect(settled.position).toBe(1);
  });

  test("waves facing the viewer, not mirrored", () => {
    const wave = patrolAt(walkMs + settleMs + 10);
    expect(wave.action).toBe("wave");
    // She turns to face you to wave. Mirroring here would have her wave
    // backwards, which is the exact bug the flag exists to avoid.
    expect(wave.mirrored).toBe(false);
  });

  test("mirrors only on the way back", () => {
    const back = patrolAt(walkMs + settleMs + waveMs + 10);
    expect(back.phase).toBe("walk-back");
    expect(back.action).toBe("walk");
    expect(back.mirrored).toBe(true);
    expect(back.position).toBeLessThan(1);
  });

  test("returns to where it started, so the loop is seamless", () => {
    const start = patrolAt(0);
    const wrapped = patrolAt(patrolDuration());
    expect(wrapped.phase).toBe(start.phase);
    expect(wrapped.position).toBe(start.position);
  });

  test("position never leaves the band", () => {
    for (let t = 0; t < patrolDuration(); t += 137) {
      const { position } = patrolAt(t);
      expect(position).toBeGreaterThanOrEqual(0);
      expect(position).toBeLessThanOrEqual(1);
    }
  });

  test("survives a clock that jumped or went backwards", () => {
    expect(() => patrolAt(-5_000)).not.toThrow();
    expect(patrolAt(-5_000).position).toBeGreaterThanOrEqual(0);
    expect(() => patrolAt(patrolDuration() * 97 + 13)).not.toThrow();
  });

  test("every moment belongs to exactly one leg", () => {
    // A gap here would show up as a one-frame freeze every loop.
    for (let t = 0; t < patrolDuration(); t += 50) {
      expect(patrolAt(t).untilNext).toBeGreaterThan(0);
    }
  });

  test("a longer band just means a longer walk", () => {
    const slow = patrolAt(6_000, { walkMs: 20_000 });
    expect(slow.phase).toBe("walk-out");
    expect(slow.position).toBeCloseTo(0.3, 1);
  });
});
