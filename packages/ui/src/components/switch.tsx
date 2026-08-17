"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "@contextjule/ui/lib/utils";

/**
 * The nudges switch. A 44x22 track with a 3px border and a square 16px knob
 * that slides 19px. Green when on, cool grey when off — the knob never changes
 * colour, only position, so the state reads at a glance in a screenshot.
 */
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
 return (
 <SwitchPrimitive.Root
 data-slot="switch"
 className={cn(
 "relative inline-flex h-[22px] w-[44px] shrink-0 items-center p-0",
 "border-3 border-border bg-[#c2cdd6] transition-colors outline-none",
 "focus-visible:border-gold focus-visible:shadow-hard-xs",
 "disabled:cursor-not-allowed disabled:opacity-50",
 "data-checked:bg-fresh",
 className,
 )}
 {...props}
 >
 <SwitchPrimitive.Thumb
 data-slot="switch-thumb"
 className={cn(
 "pointer-events-none block size-[16px] bg-border",
 "translate-x-0 transition-transform duration-100 data-checked:translate-x-[19px]",
 )}
 />
 </SwitchPrimitive.Root>
 );
}

export { Switch };
