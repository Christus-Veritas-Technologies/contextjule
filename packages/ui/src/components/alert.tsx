import { cn } from "@contextjule/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

/**
 * The inline note card — "She is fine. Ask her again in twenty thousand
 * tokens." A 2px plate with a pip, never an icon in a circle.
 */
const alertVariants = cva("flex items-center gap-2.5 border-2 px-3 py-2.5 text-[11px] leading-[1.45]", {
  variants: {
    variant: {
      default: "border-cream-border bg-cream-raised text-[#4c3f31]",
      sky: "border-sky-ink/30 bg-cream-raised text-sky-ink",
      warning: "border-crashed bg-cream-raised text-crashed-deep",
      privacy: "border-transparent bg-sky-ink font-pixel text-[9px] leading-[1.6] text-sky",
    },
  },
  defaultVariants: { variant: "default" },
});

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div data-slot="alert" role="note" className={cn(alertVariants({ variant, className }))} {...props} />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="alert-title" className={cn("font-pixel text-[9px] tracking-[0.02em]", className)} {...props} />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-description" className={cn("min-w-0", className)} {...props} />;
}

export { Alert, AlertTitle, AlertDescription, alertVariants };
