import { cn } from "@contextjule/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

/**
 * A badge is a square chip of Silkscreen. The load-state variants are the ones
 * that carry meaning; the rest are chrome.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 border-2 px-2 py-1 font-pixel text-[8px] leading-none tracking-[0.02em] whitespace-nowrap select-none [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-border bg-secondary text-secondary-foreground",
        gold: "border-ink-soft bg-gold text-ink-soft",
        outline: "border-border bg-transparent text-foreground",
        fresh: "border-transparent bg-transparent text-[#2c6b28]",
        loaded: "border-transparent bg-transparent text-[#a8621c]",
        heavy: "border-transparent bg-transparent text-[#a03a2c]",
        crashed: "border-transparent bg-transparent text-crashed-deep",
        asleep: "border-transparent bg-transparent text-[#3d3760]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant, className }))} {...props} />
  );
}

/**
 * The square colour pip that sits before a line of copy. It is how the tray,
 * the session rows and the nudge cards all say "this is the state" without
 * spending a word on it.
 */
function Pip({
  className,
  color,
  size = 8,
  ...props
}: React.ComponentProps<"span"> & { color: string; size?: number }) {
  return (
    <span
      data-slot="pip"
      aria-hidden
      className={cn("block shrink-0", className)}
      style={{ width: size, height: size, background: color }}
      {...props}
    />
  );
}

export { Badge, badgeVariants, Pip };
