"use client";

import { loadSpecFor, usedFraction } from "@contextjule/core/context";
import { formatTokens } from "@contextjule/core/format";
import { cn } from "@contextjule/ui/lib/utils";
import type * as React from "react";

import { Pip } from "./badge";
import { Switch } from "./switch";

/**
 * One conversation on the sessions screen: its name, its token count, a pixel
 * bar for its share of the window, and one line about how it went.
 *
 * The bar is eighteen 9px squares rather than the fourteen the meter uses — a
 * session row is read as a list, so the extra resolution buys a comparison
 * between rows that the coarser meter cannot give.
 */
export interface SessionRowProps extends Omit<React.ComponentProps<"div">, "children"> {
  name: string;
  tokens: number;
  windowSize?: number;
  note?: string;
  /** Rows alternate cream shades. Pass the row index. */
  index?: number;
  /** Override the computed state colour. The design sheets set these per row. */
  accent?: string;
  /** Override the computed fill, 0..1. Same reason. */
  fraction?: number;
  segments?: number;
}

function SessionRow({
  name,
  tokens,
  windowSize,
  note,
  index = 0,
  accent,
  fraction,
  segments = 18,
  className,
  ...props
}: SessionRowProps) {
  const colour = accent ?? loadSpecFor(tokens).accent;
  const filled = Math.round((fraction ?? usedFraction(tokens, windowSize)) * segments);

  return (
    <div
      data-slot="session-row"
      className={cn(
        "flex flex-col gap-2 border-b-2 border-cream-rule px-4 py-[13px]",
        index % 2 === 0 ? "bg-cream-raised" : "bg-cream",
        className,
      )}
      {...props}
    >
      <div className="flex items-baseline justify-between gap-2.5">
        <span className="truncate text-[13px] font-semibold text-[#231b12]">{name}</span>
        <span className="font-pixel text-[9px] whitespace-nowrap text-[#8a7660]">
          {formatTokens(tokens)}
        </span>
      </div>

      <div className="flex gap-[2px]">
        {Array.from({ length: segments }, (_, i) => (
          <span
            key={`${name}-${i}`}
            className="block size-[9px]"
            style={{ background: i < filled ? colour : "#e4d3b8" }}
          />
        ))}
      </div>

      {note ? (
        <div className="flex items-center gap-2">
          <Pip color={colour} size={7} />
          <span className="text-[11px] text-[#6b5b48]">{note}</span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * One switch on the nudges screen. The knob is square and only moves — it never
 * changes colour — so the state reads from position alone in a screenshot.
 */
export interface ToggleRowProps {
  name: string;
  note: string;
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
}

function ToggleRow({ name, note, checked, onCheckedChange, className }: ToggleRowProps) {
  return (
    <div
      data-slot="toggle-row"
      className={cn(
        "flex items-center justify-between gap-3.5 border-3 border-sky-ink bg-cream-raised px-3.5 py-3",
        "shadow-[4px_4px_0_rgba(18,40,61,0.22)]",
        className,
      )}
    >
      <div className="flex flex-col gap-[3px]">
        <span className="text-[13px] font-semibold text-sky-ink">{name}</span>
        <span className="text-[11px] text-[#5b6b7c]">{note}</span>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

/** A number and its unit on the growth screen. Silkscreen throughout. */
export interface StatTileProps extends Omit<React.ComponentProps<"div">, "children"> {
  value: string;
  label: string;
}

function StatTile({ value, label, className, ...props }: StatTileProps) {
  return (
    <div
      data-slot="stat-tile"
      className={cn(
        "flex flex-1 flex-col gap-[5px] border-2 border-ink bg-dusk px-3 py-[11px]",
        className,
      )}
      {...props}
    >
      <span className="font-pixel text-[15px] text-[#ffc861]">{value}</span>
      <span className="font-pixel text-[8px] leading-[1.6] text-[#bdb0d8]">{label}</span>
    </div>
  );
}

/** A cosmetic she has earned, or has not yet. Locked rows are dimmed, not hidden. */
export interface UnlockRowProps extends Omit<React.ComponentProps<"div">, "children"> {
  name: string;
  /** `unlocked`, or what it costs: "150 hours", "2M tokens". */
  requirement: string;
  unlocked?: boolean;
}

function UnlockRow({ name, requirement, unlocked = false, className, ...props }: UnlockRowProps) {
  return (
    <div
      data-slot="unlock-row"
      className={cn(
        "flex items-center justify-between gap-3 border-2 border-ink bg-dusk px-[13px] py-[11px]",
        className,
      )}
      style={{ opacity: unlocked ? 1 : 0.62 }}
      {...props}
    >
      <div className="flex items-center gap-[11px]">
        <Pip color={unlocked ? "#7bbf6a" : "#6a6478"} size={10} />
        <span className="text-[12px] text-[#e6dff5]">{name}</span>
      </div>
      <span className="font-pixel text-[8px] whitespace-nowrap text-[#bdb0d8]">{requirement}</span>
    </div>
  );
}

export { SessionRow, ToggleRow, StatTile, UnlockRow };
