/**
 * Types for `engine.js`, the sprite engine copied verbatim from
 * `designs/source/jule-sprite.js`. That file is the only thing in the design
 * archive that cannot be regenerated from something else, so it is never edited
 * here — run `pnpm sync:sprite` from the repo root to re-copy it.
 *
 * A frame is a 2D array of single-character palette keys; `.` is transparent.
 */

/** One row of a frame. Each cell is a `PAL` key, or `"."` for transparent. */
export type Row = string[];
/** A frame: rows top to bottom, aligned bottom-centre when positioned. */
export type Grid = Row[];

export declare const PAL: Record<string, string>;

export interface StateEntry {
  id: string;
  label: string;
  tokens: string;
  accent: string;
  note: string;
}
export declare const STATES: StateEntry[];

export interface ActionEntry {
  id: string;
  label: string;
  use: string;
  frames: number;
  fps: number;
  loop: boolean;
}
export declare const ACTIONS: ActionEntry[];

export interface ItemEntry {
  id: string;
  label: string;
  slot: "head" | "back" | "scene";
}
export declare const ITEMS: ItemEntry[];

export interface ActionOptions {
  /** Draw the effects layer (sparks, sweat, zeds). Off for cropped surfaces. */
  fx?: boolean;
  [key: string]: unknown;
}

export type LookDirection =
  | "up-left"
  | "up"
  | "up-right"
  | "left"
  | "right"
  | "down-left"
  | "down"
  | "down-right";

export type BalloonTail = "sw" | "se" | "nw" | "ne" | "none";

export declare class Jule {
  /** A new empty grid, all cells transparent. */
  mk(w: number, h: number): Grid;
  /** Fill a rectangle, inclusive of both corners. */
  r(g: Grid, x1: number, y1: number, x2: number, y2: number, c: string): void;
  /** Set one pixel. */
  d(g: Grid, x: number, y: number, c: string): void;
  /** Translate the whole grid. */
  shift(g: Grid, dy: number, dx: number): Grid;
  /** Trace a 1px dark outline around the silhouette, in place. */
  outline(g: Grid, col?: string): void;
  /**
   * Render a grid as a CSS `box-shadow` string: one shadow per painted cell.
   * Lets a frame be drawn in the DOM with no canvas and no image request.
   */
  shadow(g: Grid, unit: number): string;
  /** Nearest-neighbour scale by a whole number. */
  scale(g: Grid, n: number): Grid;
  /** Flip horizontally, in place. */
  mirror(g: Grid): void;

  /** How many frames an action has. */
  frames(id: string): number;
  /** One action frame. `f` wraps, so any integer is safe. */
  action(id: string, f: number, opts?: ActionOptions): Grid;
  /** One load-state frame: `fresh`, `loaded`, `heavy`, `crashed`, `chest`. */
  state(id: string, f: number, opts?: ActionOptions): Grid;
  /** A directional still, for cursor-follow. */
  look(dir: LookDirection): Grid;
  /** The side profile the walk cycle is built on. */
  sideView(o?: Record<string, unknown>): Grid;
  /** A pose wearing one of the six collectibles. */
  worn(id: string, view: "front" | "three-quarter" | "back", o?: Record<string, unknown>): Grid;
  /** An icon master at 16, 24 or 32; larger sizes are whole-number scales. */
  icon(size: number): Grid;
  /** A plated icon. `day` is the outdoor scene, `dark` is the brand plate. */
  iconPlate(size: number, variant: "day" | "dark"): Grid;
  /** A 9-slice speech box. `lines` are per-line pixel widths. */
  balloon(w: number, h: number, tail: BalloonTail, lines: number[]): Grid;
}
