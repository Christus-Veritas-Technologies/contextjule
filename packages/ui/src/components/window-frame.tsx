"use client";

import { cn } from "@contextjule/ui/lib/utils";
import { useMemo } from "react";
import type * as React from "react";

import { juleEngine } from "../jule/render";
import { Sprite } from "./sprite";

/**
 * The dark title bar every surface shares: the mark, the name in Silkscreen,
 * and three square window buttons. Two grey, one red — squares, never circles,
 * and never a system chrome we do not control.
 */
export interface TitleBarProps extends React.ComponentProps<"div"> {
  title?: string;
  /** Show the pixel mark to the left of the title. Off on secondary windows. */
  showMark?: boolean;
  /** Two buttons on the compact surfaces, three on the main window. */
  buttons?: 2 | 3;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
}

function TitleBar({
  title = "contextjule",
  showMark = false,
  buttons = 3,
  onMinimize,
  onMaximize,
  onClose,
  className,
  children,
  ...props
}: TitleBarProps) {
  return (
    <div
      data-slot="title-bar"
      data-tauri-drag-region
      className={cn(
        "flex items-center justify-between gap-2.5 border-b-3 border-ink bg-ink-soft px-3 py-[9px]",
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-2.5">
        {showMark ? <TitleMark /> : null}
        <span className="font-pixel text-[10px] tracking-[0.02em] text-[#e8e2d6]">{title}</span>
      </div>
      {children}
      <div className="flex gap-1.5">
        {buttons === 3 ? (
          <WindowButton tone="grey" label="Minimize" onClick={onMinimize} />
        ) : null}
        <WindowButton tone="grey" label="Maximize" onClick={onMaximize} />
        <WindowButton tone="red" label="Close" onClick={onClose} />
      </div>
    </div>
  );
}

/** The 16px icon master at 1x. A different drawing from the 32, not a shrink. */
function TitleMark() {
  const mark = useMemo(() => juleEngine().icon(16), []);
  return <Sprite grid={mark} scale={1} className="shrink-0" />;
}

function WindowButton({
  tone,
  label,
  onClick,
}: {
  tone: "grey" | "red";
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "block size-[10px] outline-none focus-visible:ring-2 focus-visible:ring-gold",
        tone === "red" ? "bg-crashed hover:bg-[#ff6a6a]" : "bg-asleep hover:bg-[#928ba6]",
      )}
    />
  );
}

/**
 * The app window: 3px border, hard offset, no radius. Every screen sits inside
 * one of these, and the title bar and tab strip are its fixed ends.
 */
function WindowFrame({
  className,
  width,
  ...props
}: React.ComponentProps<"div"> & { width?: number }) {
  return (
    <div
      data-slot="window-frame"
      className={cn("flex flex-col border-3 border-ink bg-cream shadow-hard-xl", className)}
      style={width ? { width } : undefined}
      {...props}
    />
  );
}

export { TitleBar, TitleMark, WindowFrame, WindowButton };
