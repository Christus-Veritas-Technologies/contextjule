"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { actionSpec, renderStateStrip, renderStrip, type RenderedFrame } from "../jule/render";

/**
 * Play a sprite action, driven by an interval that reads the wall clock.
 *
 * The clock, not a frame counter, is the source of truth: requestAnimationFrame
 * is throttled to nothing in a background tab or a hidden Tauri window, and a
 * counter would strand her mid-step. A sparse tick still lands on the right pose.
 */
export function useSpriteAnimation(
  action: string,
  unit: number,
  options: {
    fx?: boolean;
    playing?: boolean;
    state?: boolean;
    frameIndex?: number;
    mirrored?: boolean;
  } = {},
): RenderedFrame | undefined {
  const { fx = true, playing = true, state = false, frameIndex, mirrored = false } = options;

  const strip = useMemo(
    () => (state ? renderStateStrip(action, unit) : renderStrip(action, unit, { fx }, mirrored)),
    [action, unit, fx, state, mirrored],
  );

  const spec = state ? undefined : actionSpec(action);
  const fps = spec?.fps ?? 6;
  const loop = state ? true : (spec?.loop ?? true);

  const [frame, setFrame] = useState(0);
  const startedAt = useRef<number>(Date.now());

  // Restarting the strip restarts the clock, so a non-looping action always
  // plays from its first frame when it is swapped in.
  useEffect(() => {
    startedAt.current = Date.now();
    setFrame(0);
  }, [action, state]);

  useEffect(() => {
    if (!playing || strip.length <= 1) return;
    const period = 1000 / fps;
    const id = setInterval(() => {
      const elapsed = Date.now() - startedAt.current;
      const raw = Math.floor(elapsed / period);
      setFrame(loop ? raw % strip.length : Math.min(raw, strip.length - 1));
    }, period);
    return () => clearInterval(id);
  }, [playing, fps, loop, strip.length]);

  const index = frameIndex ?? frame;
  return strip[Math.min(Math.max(0, index), strip.length - 1)];
}

/** Respect the machine's reduced-motion setting: hold frame 0 instead of looping. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}
