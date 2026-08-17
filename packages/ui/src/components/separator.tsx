import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";
import { cn } from "@contextjule/ui/lib/utils";

/** Rules between rows are 2px; chrome edges are 3px. This is the 2px one. */
function Separator({ className, orientation = "horizontal", ...props }: SeparatorPrimitive.Props) {
 return (
 <SeparatorPrimitive
 data-slot="separator"
 orientation={orientation}
 className={cn(
 "shrink-0 bg-muted",
 orientation === "horizontal" ? "h-[2px] w-full" : "h-full w-[2px]",
 className,
 )}
 {...props}
 />
 );
}

export { Separator };
