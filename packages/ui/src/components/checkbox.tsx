"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { cn } from "@contextjule/ui/lib/utils";

/**
 * A square box with a square fill. No tick glyph at small sizes — the fill is
 * the state, the same way the meter segments are.
 */
function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
 return (
 <CheckboxPrimitive.Root
 data-slot="checkbox"
 className={cn(
 "peer relative flex size-[18px] shrink-0 items-center justify-center",
 "border-3 border-border bg-cream-raised transition-colors outline-none",
 "focus-visible:border-gold focus-visible:shadow-hard-xs",
 "disabled:cursor-not-allowed disabled:opacity-50",
 "aria-invalid:border-crashed",
 "data-checked:bg-gold",
 className,
 )}
 {...props}
 >
 <CheckboxPrimitive.Indicator
 data-slot="checkbox-indicator"
 className="size-[6px] bg-ink-soft transition-none"
 />
 </CheckboxPrimitive.Root>
 );
}

export { Checkbox };
