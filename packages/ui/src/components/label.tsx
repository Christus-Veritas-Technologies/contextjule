"use client";

import { cn } from "@contextjule/ui/lib/utils";
import * as React from "react";

/** Labels are UI type, so they are Silkscreen. Body copy is not. */
function Label({ className, ...props }: React.ComponentProps<"label">) {
 return (
 <label
 data-slot="label"
 className={cn(
 "flex items-center gap-2 font-pixel text-[9px] leading-none tracking-[0.02em] select-none",
 "group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50",
 "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
 className,
 )}
 {...props}
 />
 );
}

export { Label };
