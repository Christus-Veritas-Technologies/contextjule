"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "@contextjule/ui/lib/utils";
import { XIcon } from "lucide-react";
import type * as React from "react";

/**
 * A panel that slides in from an edge.
 *
 * The design archive has no sheet in it — nothing in the desktop app needs one,
 * because every window is already the size of a sheet. This exists for the
 * marketing site's narrow layout, where the nav row cannot hold its links, and
 * it is built from the same three rules as everything else rather than from a
 * component library's defaults: a 3px ink border on the edges that are visible,
 * a hard offset shadow, no radius, and a flat ink backdrop instead of a blur.
 *
 * It is a dialog underneath, so focus trapping, Escape, scroll locking and the
 * `aria-modal` semantics are handled — a hand-rolled overlay gets those wrong
 * in ways that are invisible to whoever built it and obvious to anyone using a
 * keyboard.
 */
function Sheet({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="sheet-close" {...props} />;
}

const SIDES = {
  top: [
    "inset-x-0 top-0 border-b-3 shadow-[0_6px_0_var(--chrome-shadow)]",
    "data-closed:-translate-y-full",
  ],
  bottom: [
    "inset-x-0 bottom-0 border-t-3 shadow-[0_-6px_0_var(--chrome-shadow)]",
    "data-closed:translate-y-full",
  ],
  left: [
    "inset-y-0 left-0 w-[min(88vw,340px)] border-r-3 shadow-[6px_0_0_var(--chrome-shadow)]",
    "data-closed:-translate-x-full",
  ],
  right: [
    "inset-y-0 right-0 w-[min(88vw,340px)] border-l-3 shadow-[-6px_0_0_var(--chrome-shadow)]",
    "data-closed:translate-x-full",
  ],
} as const;

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  side?: keyof typeof SIDES;
  showCloseButton?: boolean;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        data-slot="sheet-backdrop"
        className="fixed inset-0 z-50 bg-ink/75 transition-opacity duration-200 data-closed:opacity-0 data-open:opacity-100"
      />
      <DialogPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          "fixed z-50 flex flex-col border-ink bg-night-raised text-foreground outline-none",
          // Slides rather than fades: a panel that appears in place reads as a
          // glitch at this border weight.
          "transition-transform duration-200 ease-out",
          SIDES[side],
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <DialogPrimitive.Close
            data-slot="sheet-close"
            aria-label="Close"
            className="absolute top-4 right-4 flex size-[14px] items-center justify-center bg-crashed outline-none hover:bg-[#ff6a6a] focus-visible:ring-2 focus-visible:ring-gold"
          >
            <XIcon className="size-[9px] text-cream" />
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn(
        "flex items-center gap-2.5 border-b-3 border-ink bg-ink-soft px-5 py-4",
        className,
      )}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="sheet-title"
      className={cn("font-pixel text-[11px] tracking-[0.02em] text-cream", className)}
      {...props}
    />
  );
}

function SheetDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-[13px] leading-[1.6] text-muted-foreground", className)}
      {...props}
    />
  );
}

function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-body"
      className={cn("flex flex-1 flex-col gap-1 overflow-y-auto p-5", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("flex flex-col gap-3 border-t-3 border-night-rule p-5", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
};
