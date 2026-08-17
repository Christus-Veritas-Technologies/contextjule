import { cn } from "@contextjule/ui/lib/utils";
import type * as React from "react";

/**
 * Loading state is a dashed plate, not a shimmer. A blurred pulse would be the
 * only soft thing on the screen.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse border-2 border-dashed border-muted bg-muted/40", className)}
      {...props}
    />
  );
}

export { Skeleton };
