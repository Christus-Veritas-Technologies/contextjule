import { loadSpecFor, METER_EMPTY, METER_SEGMENTS, meterSegments } from "@contextjule/core/context";
import { cn } from "@contextjule/ui/lib/utils";
import type * as React from "react";

/**
 * The context meter: fourteen square segments, filled left to right.
 *
 * It is deliberately not a continuous bar. Segments are countable at a glance
 * from across a desk, and they scale to any window width without the fill ever
 * becoming a sub-pixel sliver.
 *
 * `filled` and `color` exist so a screen can reproduce a design sheet's exact
 * mock reading. Leave them off and the meter derives both from the token count,
 * which is what every live surface does.
 */
export interface MeterProps extends Omit<React.ComponentProps<"div">, "children" | "color"> {
  tokens: number;
  /** Size of the context window. Defaults to 200k. */
  windowSize?: number;
  segments?: number;
  /** Segment height in px. 9 in a session row, 11 in the bar, 16 on the panel. */
  segmentHeight?: number;
  /** Fixed segment width, or omit to let segments share the row. */
  segmentWidth?: number;
  gap?: number;
  /** Force the number of filled segments. */
  filled?: number;
  /** Force the fill colour. */
  color?: string;
}

function Meter({
  tokens,
  windowSize,
  segments = METER_SEGMENTS,
  segmentHeight = 11,
  segmentWidth,
  gap = 2,
  filled,
  color,
  className,
  style,
  ...props
}: MeterProps) {
  const derived = meterSegments(tokens, windowSize, segments);
  const filledCount = filled ?? derived.filter((cell) => cell.filled).length;
  const fill = color ?? loadSpecFor(tokens).meter;

  return (
    <div
      data-slot="meter"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={segments}
      aria-valuenow={filledCount}
      aria-label="Context used"
      className={cn("flex", className)}
      style={{ gap, ...style }}
      {...props}
    >
      {Array.from({ length: segments }, (_, index) => (
        <span
          key={index}
          className="block"
          style={{
            background: index < filledCount ? fill : METER_EMPTY,
            height: segmentHeight,
            width: segmentWidth,
            flex: segmentWidth ? undefined : "1 1 0",
          }}
        />
      ))}
    </div>
  );
}

export { Meter };
