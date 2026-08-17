"use client";

import {
  ACTIVITY_SPECS,
  type Activity,
  loadSpecFor,
  MINI_BAR_SIZE_SPECS,
  type MiniBarSize,
  spriteActionFor,
} from "@contextjule/core";
import { formatTokens } from "@contextjule/core/format";
import { cn } from "@contextjule/ui/lib/utils";
import type * as React from "react";

import { Button } from "./button";
import { Meter } from "./meter";
import { Sprite } from "./sprite";

/**
 * The always-on-top strip, and the surface people look at most.
 *
 * A sky panel on the left crops her to head and shoulders; the meter, the token
 * count and one caption line sit to the right. The load state owns the meter
 * colour, the activity owns her frame and the panel behind her — they change
 * independently, which is why one component reads both.
 *
 * The expanded size only unlocks at heavy and crashed, and it puts the cleanse
 * button inline so the fix is one click from the bar.
 */
export interface MiniBarProps extends Omit<React.ComponentProps<"div">, "children"> {
  tokens: number;
  windowSize?: number;
  activity?: Activity;
  size?: MiniBarSize;
  /** Overrides the activity's stock caption. */
  caption?: string;
  onCleanse?: () => void;
  onDismiss?: () => void;
}

function MiniBar({
  tokens,
  windowSize,
  activity = "idle",
  size = "default",
  caption,
  onCleanse,
  onDismiss,
  className,
  style,
  ...props
}: MiniBarProps) {
  const dims = MINI_BAR_SIZE_SPECS[size];
  const load = loadSpecFor(tokens);
  const act = ACTIVITY_SPECS[activity];
  const asleep = activity === "asleep";

  const labelSize = size === "compact" ? 8 : size === "expanded" ? 10 : 9;
  const numberSize = size === "compact" ? 10 : size === "expanded" ? 13 : 11;
  const segmentHeight = size === "compact" ? 9 : size === "expanded" ? 13 : 11;

  return (
    <div
      data-slot="mini-bar"
      data-state={load.id}
      data-activity={activity}
      className={cn(
        "flex items-stretch overflow-hidden border-3 border-ink bg-cream shadow-hard-lg",
        className,
      )}
      style={{ width: dims.width, height: dims.height, ...style }}
      {...props}
    >
      {/* The sky panel is the crop. Her frame overflows it deliberately. */}
      <div
        className="flex shrink-0 items-start overflow-hidden border-r-3 border-ink"
        style={{ width: dims.panelWidth, background: act.panel }}
      >
        <Sprite
          action={spriteActionFor(activity, load.id)}
          state={activity === "idle" ? load.id : undefined}
          scale={dims.spriteScale}
          fx={false}
          className="-ml-1"
        />
      </div>

      <div
        className="flex min-w-0 flex-1 flex-col justify-center"
        style={{
          gap: size === "compact" ? 5 : size === "expanded" ? 8 : 6,
          paddingInline: size === "compact" ? 11 : size === "expanded" ? 16 : 14,
        }}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span
            className="font-pixel tracking-[0.02em] whitespace-nowrap"
            style={{ fontSize: labelSize, color: asleep ? act.labelColor : load.labelColor }}
          >
            {asleep ? act.label : load.label}
          </span>
          <span
            className="font-pixel whitespace-nowrap text-[#231b12]"
            style={{ fontSize: numberSize }}
          >
            {asleep ? "—" : formatTokens(tokens)}
          </span>
        </div>

        <Meter
          tokens={asleep ? 0 : tokens}
          windowSize={windowSize}
          segmentHeight={segmentHeight}
        />

        {dims.hasCaption ? (
          <span
            className="truncate text-[#6b5b48]"
            style={{ fontSize: size === "expanded" ? 11 : 10, lineHeight: 1.45 }}
          >
            {caption ?? act.caption}
          </span>
        ) : null}

        {dims.hasButtons ? (
          <div className="mt-0.5 flex gap-[7px]">
            <Button size="xs" variant="primary" className="flex-1" onClick={onCleanse}>
              help her carry this
            </Button>
            <Button size="icon-xs" variant="secondary" onClick={onDismiss} aria-label="Dismiss">
              x
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export { MiniBar };
