"use client";

import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import { cn } from "@contextjule/ui/lib/utils";
import type * as React from "react";

/** A square scrollbar with a square thumb. No rounded track, no fade. */
function ScrollArea({
  className,
  children,
  ...props
}: ScrollAreaPrimitive.Root.Props & { children?: React.ReactNode }) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="size-full overscroll-contain outline-none"
      >
        <ScrollAreaPrimitive.Content>{children}</ScrollAreaPrimitive.Content>
      </ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar
        data-slot="scroll-area-scrollbar"
        orientation="vertical"
        className="flex w-[10px] touch-none border-l-2 border-muted bg-transparent p-0 select-none"
      >
        <ScrollAreaPrimitive.Thumb className="w-full bg-muted-foreground/50" />
      </ScrollAreaPrimitive.Scrollbar>
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

export { ScrollArea };
