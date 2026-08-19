"use client";

import { useEffect, useRef, useState } from "react";

import { usePrefersReducedMotion } from "./use-sprite";

/**
 * Roll a number to its new value instead of swapping it.
 *
 * The transcript readers cannot make the count arrive smoothly, because it does
 * not arrive smoothly: Claude Code writes one `usage` block when an assistant
 * message completes, so a reply that took ninety seconds lands as a single jump
 * of forty thousand tokens. Polling faster only learns the same number sooner.
 *
 * So the liveness is here rather than in the reader. The number climbs to where
 * it landed, the meter fills behind it, and a session that is quietly getting
 * heavier looks like something happening rather than a field that was one value
 * and is now another.
 *
 * Twelve frames over 600ms, quantised — not a 60fps tween. She is pixel art and
 * the digits are a pixel font; a smooth interpolation would spend most of its
 * frames drawing glyphs mid-transition that the font has no shape for.
 */
const DURATION_MS = 600;
const TICK_MS = 50;

export interface CountUpOptions {
  /** Off for sample readings and design sheets, where nothing is arriving. */
  enabled?: boolean;
  durationMs?: number;
}

export function useCountUp(target: number, options: CountUpOptions = {}): number {
  const { enabled = true, durationMs = DURATION_MS } = options;
  const reduced = usePrefersReducedMotion();

  const [shown, setShown] = useState(target);
  /** The live value, so a tick never reads a stale render's copy. */
  const value = useRef(target);
  /** The first value is where she already is, not somewhere to travel from. */
  const started = useRef(false);

  useEffect(() => {
    const snap = () => {
      value.current = target;
      setShown(target);
    };

    if (!started.current) {
      started.current = true;
      snap();
      return;
    }
    if (!enabled || reduced || target === value.current) {
      snap();
      return;
    }

    const from = value.current;
    const distance = target - from;
    const startedAt = Date.now();

    const id = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      if (elapsed >= durationMs) {
        clearInterval(id);
        snap();
        return;
      }
      // Ease out: most of the distance in the first few frames, so a big jump
      // reads as a lurch that settles rather than a constant-speed odometer.
      const t = elapsed / durationMs;
      const eased = 1 - (1 - t) * (1 - t);
      value.current = Math.round(from + distance * eased);
      setShown(value.current);
    }, TICK_MS);

    return () => clearInterval(id);
  }, [target, enabled, reduced, durationMs]);

  return shown;
}
