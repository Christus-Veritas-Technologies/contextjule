"use client";

import { cn } from "@contextjule/ui/lib/utils";
import type * as React from "react";

import { usePrefersReducedMotion, useSpriteAnimation } from "../hooks/use-sprite";
import { juleEngine, renderGrid, type Grid, type RenderedFrame } from "../jule/render";

/**
 * One sprite frame, drawn as a stack of box-shadows on a single element.
 *
 * No image request, no canvas, and — because `scale` is a whole number — no
 * resampling. Frames are aligned bottom-centre, so anchor the bottom edge to
 * the ground line; a naive top-left anchor floats her.
 *
 * `anchor` decides what the element's own box means, and it matters when you
 * are positioning against numbers taken from the design sheets:
 *
 *   "box"     the element is the frame's bounding box. Layout behaves the way
 *             you expect, and the frame never overflows. Use this by default.
 *   "origin"  the element is a single source pixel at the frame's top-left,
 *             exactly as the design HTML draws it. Every `left` / `top` /
 *             `bottom` value in `designs/screens` is measured against this, so
 *             use it when you are reproducing one of those positions verbatim.
 */
export interface SpriteProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** Action id from `designs/animations/manifest.json`, e.g. `idle`, `walk`. */
  action?: string;
  /** Load-state id: `fresh`, `loaded`, `heavy`, `crashed`, `chest`. */
  state?: string;
  /** Whole-number scale. Never fractional — see designs/README.md. */
  scale?: number;
  /** Draw the effects layer. Off when the frame is cropped by a panel. */
  fx?: boolean;
  playing?: boolean;
  /** Freeze on one frame instead of animating. */
  frameIndex?: number;
  anchor?: "box" | "origin";
  /**
   * Flip her horizontally.
   *
   * The walk cycle is drawn facing one way and mirrored for the other — the
   * design archive is explicit that there is no second strip.
   */
  mirrored?: boolean;
  /**
   * A collectible to draw her wearing, from `designs/animations/manifest.json`.
   *
   * The engine draws worn items as part of the pose rather than as an overlay —
   * the pack shell goes behind her arm, a hat sits under the hair sway — so
   * this replaces the frame rather than layering on top of one. That is also
   * why it only applies to a standing pose: `worn()` has three views, not
   * twenty animations.
   */
  wearing?: string;
  /** Which way she is facing when wearing something. */
  view?: "front" | "three-quarter" | "back";
  /** Render a pre-built grid instead of an action. */
  grid?: Grid;
  /** Render an already-rendered frame. Cheapest path for a long strip. */
  frame?: RenderedFrame;
}

function Sprite({
  action = "idle",
  state,
  scale = 2,
  fx = true,
  playing = true,
  frameIndex,
  anchor = "box",
  mirrored = false,
  wearing,
  view = "front",
  grid,
  frame,
  className,
  style,
  ...props
}: SpriteProps) {
  const reduced = usePrefersReducedMotion();
  const animated = useSpriteAnimation(state ?? action, scale, {
    fx,
    playing: playing && !reduced && frameIndex === undefined && !grid && !frame && !wearing,
    state: Boolean(state),
    frameIndex,
    mirrored,
  });

  const worn = wearing ? renderGrid(juleEngine().worn(wearing, view, {}), scale, mirrored) : null;
  const rendered = frame ?? worn ?? (grid ? renderGrid(grid, scale, mirrored) : animated);
  if (!rendered) return null;

  if (anchor === "origin") {
    return (
      <div
        data-slot="sprite"
        aria-hidden
        className={cn("pixelated", className)}
        style={{
          width: rendered.unit,
          height: rendered.unit,
          boxShadow: rendered.boxShadow,
          ...style,
        }}
        {...props}
      />
    );
  }

  return (
    <div
      data-slot="sprite"
      aria-hidden
      className={cn("pixelated relative shrink-0", className)}
      style={{ width: rendered.width, height: rendered.height, ...style }}
      {...props}
    >
      <div
        className="absolute top-0 left-0"
        style={{ width: rendered.unit, height: rendered.unit, boxShadow: rendered.boxShadow }}
      />
    </div>
  );
}

export { Sprite };
