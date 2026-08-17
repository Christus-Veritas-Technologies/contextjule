import { cn } from "@contextjule/ui/lib/utils";
import * as React from "react";

/**
 * A card is a plate on a band: 3px border, hard offset shadow, square corners.
 * `tone` picks how hard the plate reads against whatever band it is sitting on.
 */
function Card({
 className,
 tone = "raised",
 ...props
}: React.ComponentProps<"div"> & { tone?: "raised" | "flat" | "inset" }) {
 return (
 <div
 data-slot="card"
 data-tone={tone}
 className={cn(
 "group/card flex flex-col gap-(--card-gap) bg-card p-(--card-gap) text-card-foreground",
 "[--card-gap:--spacing(3)]",
 tone === "raised" && "border-3 border-border shadow-hard-md",
 tone === "flat" && "border-2 border-border",
 tone === "inset" && "border-2 border-muted bg-transparent",
 className,
 )}
 {...props}
 />
 );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
 return (
 <div
 data-slot="card-header"
 className={cn("flex items-baseline justify-between gap-2", className)}
 {...props}
 />
 );
}

/** Card titles are Silkscreen — they are UI labels, not prose. */
function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
 return (
 <div
 data-slot="card-title"
 className={cn("font-pixel text-[10px] tracking-[0.02em]", className)}
 {...props}
 />
 );
}

/** Descriptions are Space Grotesk — this is the one place prose belongs. */
function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
 return (
 <div
 data-slot="card-description"
 className={cn("text-[11px] leading-[1.5] text-muted-foreground", className)}
 {...props}
 />
 );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
 return <div data-slot="card-action" className={cn("shrink-0", className)} {...props} />;
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
 return <div data-slot="card-content" className={cn("flex flex-col gap-2", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
 return (
 <div
 data-slot="card-footer"
 className={cn("mt-auto flex items-center gap-2 pt-1", className)}
 {...props}
 />
 );
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
