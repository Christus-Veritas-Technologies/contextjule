import { cn } from "@contextjule/ui/lib/utils";
import * as React from "react";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
 return (
 <textarea
 data-slot="textarea"
 className={cn(
 "flex field-sizing-content min-h-20 w-full resize-none border-3 border-border bg-cream-raised px-3 py-2",
 "text-[12px] leading-[1.5] text-foreground transition-colors outline-none",
 "placeholder:text-muted-foreground",
 "focus-visible:border-gold focus-visible:shadow-hard-xs",
 "disabled:cursor-not-allowed disabled:opacity-50",
 "aria-invalid:border-crashed",
 className,
 )}
 {...props}
 />
 );
}

export { Textarea };
