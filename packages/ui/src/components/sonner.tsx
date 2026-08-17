"use client";

import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";
import type * as React from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * Toasts are the speech box in another position: cream plate, 3px rule, hard
 * offset, Silkscreen copy. There is no theme to read — ContextJule has one.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--jule-cream-speech)",
          "--normal-text": "var(--jule-ink-soft)",
          "--normal-border": "var(--jule-ink-soft)",
          "--border-radius": "0px",
          "--error-bg": "var(--jule-cream-speech)",
          "--error-text": "var(--jule-crashed-deep)",
          "--error-border": "var(--jule-crashed)",
          "--success-bg": "var(--jule-gold)",
          "--success-text": "var(--jule-ink-soft)",
          "--success-border": "var(--jule-ink-soft)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "cn-toast !border-3 !shadow-[5px_5px_0_var(--jule-ink-soft)] !font-pixel !text-[10px] !leading-[1.5]",
          description: "!font-sans !text-[11px]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
