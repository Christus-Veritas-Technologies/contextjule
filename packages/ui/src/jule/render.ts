import { ACTIONS, Jule, type ActionOptions, type Grid, type Row } from "./engine.js";

// Re-exported so a component can type a hand-built frame without reaching past
// this module into the engine.
export type { Grid, Row, ActionOptions };

/**
 * A frame is drawn as a stack of `box-shadow`s on one 1x1 element, so a sprite
 * costs zero image requests, scales by whole numbers only, and can never be
 * resampled by the browser. This is the same technique the design sheets use.
 */
export interface RenderedFrame {
  /** Drop straight into `box-shadow`. */
  readonly boxShadow: string;
  /** Size of one source pixel, in CSS pixels. */
  readonly unit: number;
  /** Rendered size of the whole frame. */
  readonly width: number;
  readonly height: number;
}

/** One shared engine instance. Frame generation is pure, so this is safe. */
let engine: Jule | null = null;
export function juleEngine(): Jule {
  if (!engine) engine = new Jule();
  return engine;
}

/**
 * Flip a copy rather than the original.
 *
 * The engine's `mirror` works in place, and strips are cached — mirroring the
 * cached grid would flip her permanently on the second pass.
 */
function mirrored(grid: Grid): Grid {
  const copy = grid.map((row) => row.slice());
  juleEngine().mirror(copy);
  return copy;
}

export function renderGrid(source: Grid, unit: number, flip = false): RenderedFrame {
  const j = juleEngine();
  const grid = flip ? mirrored(source) : source;
  const firstRow = grid[0];
  return {
    boxShadow: j.shadow(grid, unit),
    unit,
    width: (firstRow?.length ?? 0) * unit,
    height: grid.length * unit,
  };
}

export function renderAction(
  id: string,
  frame: number,
  unit: number,
  opts?: ActionOptions,
): RenderedFrame {
  return renderGrid(juleEngine().action(id, frame, opts), unit);
}

export function renderState(id: string, frame: number, unit: number): RenderedFrame {
  return renderGrid(juleEngine().state(id, frame), unit);
}

/**
 * Every frame of one action, pre-rendered. Generating a frame walks a 30x40
 * grid and builds a long string, so anything that animates should hold the
 * whole strip rather than regenerate on each tick.
 */
export function renderStrip(
  id: string,
  unit: number,
  opts?: ActionOptions,
  flip = false,
): RenderedFrame[] {
  const j = juleEngine();
  const count = actionSpec(id)?.frames ?? j.frames(id);
  return Array.from({ length: count }, (_, f) => renderGrid(j.action(id, f, opts), unit, flip));
}

export function renderStateStrip(id: string, unit: number, frames = 4): RenderedFrame[] {
  const j = juleEngine();
  return Array.from({ length: frames }, (_, f) => renderGrid(j.state(id, f), unit));
}

export function actionSpec(id: string) {
  return ACTIONS.find((a) => a.id === id);
}

/**
 * Which frame an action is on at a given wall-clock time.
 *
 * It reads the clock rather than counting ticks on purpose: requestAnimationFrame
 * is throttled to nothing in a background tab, and a sparse tick would otherwise
 * strand her mid-step. A slow tick still lands on the right pose.
 */
export function frameAt(id: string, elapsedMs: number): number {
  const spec = actionSpec(id);
  const fps = spec?.fps ?? 8;
  const count = spec?.frames ?? 8;
  const raw = Math.floor((elapsedMs / 1000) * fps);
  if (spec && !spec.loop) return Math.min(raw, count - 1);
  return ((raw % count) + count) % count;
}
