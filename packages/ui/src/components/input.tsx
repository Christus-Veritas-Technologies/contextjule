import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "@contextjule/ui/lib/utils";
import * as React from "react";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-[38px] w-full min-w-0 border-3 border-border bg-cream-raised px-3 py-1",
        "text-[12px] text-foreground transition-colors outline-none",
        "placeholder:text-muted-foreground placeholder:font-pixel placeholder:text-[9px]",
        "focus-visible:border-gold focus-visible:shadow-hard-xs",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-crashed aria-invalid:text-crashed-deep",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:font-pixel file:text-[9px]",
        className,
      )}
      {...props}
    />
  );
}

/**
 * A license key field.
 *
 * Deliberately neither uppercased nor capitalised. Dodo issues lowercase UUID
 * keys and matches them case-sensitively, so `autoCapitalize="characters"` —
 * which really does rewrite what a soft keyboard types — produced a key Dodo
 * had never heard of, and the `uppercase` class made the field lie about what
 * it was holding. `font-code` for the same reason: Silkscreen has no lowercase
 * glyphs, so it cannot show the difference between the key that works and the
 * one that does not.
 */
function KeyInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <Input
      data-slot="key-input"
      autoComplete="off"
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      className={cn("font-code text-[11px] tracking-[0.06em]", className)}
      {...props}
    />
  );
}

export { Input, KeyInput };
