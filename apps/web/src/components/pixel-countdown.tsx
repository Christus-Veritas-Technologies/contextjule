"use client";

import { pad2 } from "@contextjule/core/promo";
import { cn } from "@contextjule/ui/lib/utils";

import { useCountdown } from "@/lib/use-promo";

/**
 * The 72-hour countdown, as pixel digits.
 *
 * Every digit sits in its own plate of a fixed width. Silkscreen is not a
 * tabular font — a `1` is narrower than a `0` — so a countdown typed as one
 * string visibly shudders sideways every second. One plate per digit is what
 * stops that, and it is also what makes it read as a clock rather than as a
 * sentence.
 *
 * Hours are not capped at 24. `71:59:58` is immediately legible as "nearly
 * three days"; `2d 23h` is a sum somebody has to do.
 */
export function PixelCountdown({
  endsAt,
  size = "lg",
  className,
}: {
  endsAt: string | null;
  size?: "sm" | "lg";
  className?: string;
}) {
  const left = useCountdown(endsAt);
  if (!left) return null;

  const groups: Array<{ value: string; label: string }> = [
    { value: pad2(left.hours), label: "hrs" },
    { value: pad2(left.minutes), label: "min" },
    { value: pad2(left.seconds), label: "sec" },
  ];

  const digit =
    size === "lg"
      ? "h-[54px] w-[38px] text-[26px] md:h-[64px] md:w-[46px] md:text-[32px]"
      : "h-[34px] w-[24px] text-[16px]";

  return (
    <div
      className={cn("flex items-end gap-2 md:gap-3", className)}
      // The whole clock is one thing being announced, and announcing it every
      // second would make a screen reader unusable. It is decorative urgency;
      // the deadline is stated in words beside it.
      aria-hidden
    >
      {groups.map((group, index) => (
        <div key={group.label} className="flex items-end gap-2 md:gap-3">
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex gap-1">
              {group.value.split("").map((character, position) => (
                <span
                  key={`${group.label}-${position}`}
                  className={cn(
                    "flex items-center justify-center border-3 border-ink-soft bg-ink-soft",
                    "font-pixel text-cream tabular-nums shadow-[3px_3px_0_rgba(21,42,18,0.35)]",
                    digit,
                  )}
                >
                  {character}
                </span>
              ))}
            </div>
            <span className="font-pixel text-[8px] tracking-[0.14em] text-ink-soft/70 md:text-[9px]">
              {group.label}
            </span>
          </div>
          {index < groups.length - 1 ? (
            <span
              className={cn(
                "flex flex-col gap-1.5 pb-6 md:pb-7",
                size === "lg" ? "pb-6" : "pb-4",
              )}
            >
              <span className="block size-[4px] bg-ink-soft/60 md:size-[5px]" />
              <span className="block size-[4px] bg-ink-soft/60 md:size-[5px]" />
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
