"use client";

import {
  SPEECH_MAX_LINES,
  SPEECH_TAIL_ROWS,
  SPEECH_TAIL_SCALE,
  SPEECH_TONE_SPECS,
  type SpeechTone,
} from "@contextjule/core/speech";
import { cn } from "@contextjule/ui/lib/utils";
import { useMemo } from "react";
import type * as React from "react";

import { juleEngine } from "../jule/render";
import { Sprite } from "./sprite";

/**
 * The speech box. Cream plate, 3px rule, hard offset, and a stepped tail drawn
 * as a sprite rather than a CSS wedge — a rotated border would be the only
 * anti-aliased edge on the screen.
 *
 * Copy is Silkscreen, three lines maximum. Anything longer opens the panel
 * instead of a balloon; `fitsInBalloon` in @contextjule/core is that check.
 */
export interface SpeechBoxProps extends Omit<React.ComponentProps<"div">, "children"> {
  lines: string[];
  tone?: SpeechTone;
  /** Which corner the tail leaves from, pointing down at her. */
  tail?: "down-left" | "down-right" | "none";
  /** Defaults to the width the design draws this tone at. */
  width?: number;
  fontSize?: number;
}

function SpeechBox({
  lines,
  tone = "normal",
  tail = "down-left",
  width,
  fontSize = 10,
  className,
  style,
  ...props
}: SpeechBoxProps) {
  const spec = SPEECH_TONE_SPECS[tone];
  const shown = lines.slice(0, SPEECH_MAX_LINES);

  /* Both tails come straight from the design sheet's own builders: a stepped
     wedge nine rows tall, or three detached squares for a thought. */
  const tailGrid = useMemo(() => {
    const j = juleEngine();

    if (spec.tail === "dotted") {
      const g = j.mk(10, 12);
      j.r(g, 0, 0, 3, 3, "u");
      j.r(g, 4, 5, 6, 7, "u");
      j.r(g, 7, 9, 8, 10, "u");
      j.outline(g);
      return g;
    }

    const rows = SPEECH_TAIL_ROWS;
    const g = j.mk(rows + 1, rows);
    for (let y = 0; y < rows; y++) {
      j.r(g, 0, y, Math.max(0, rows - y), y, "u");
    }
    j.outline(g);
    if (tail === "down-right") j.mirror(g);
    return g;
  }, [spec.tail, tail]);

  return (
    <div data-slot="speech-box" className={cn("relative w-fit", className)} style={style} {...props}>
      <div
        data-slot="speech-box-plate"
        className="flex flex-col gap-1.5 border-3 box-border"
        style={{
          width: width ?? spec.width,
          padding: "12px 14px",
          background: spec.bg,
          borderColor: spec.border,
          boxShadow: `5px 5px 0 ${spec.shadow}`,
        }}
      >
        {shown.map((line, index) => (
          <span
            // Lines are positional copy, not identified content.
            // biome-ignore lint/suspicious/noArrayIndexKey: order is the identity here
            key={index}
            className="font-pixel"
            style={{ fontSize, lineHeight: 1.5, color: spec.ink }}
          >
            {line}
          </span>
        ))}
      </div>

      {tail !== "none" ? (
        <Sprite
          grid={tailGrid}
          scale={SPEECH_TAIL_SCALE}
          className={cn("absolute top-full -mt-[3px]", tail === "down-left" ? "left-4" : "right-4")}
        />
      ) : null}
    </div>
  );
}

export { SpeechBox };
