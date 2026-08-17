/**
 * The four windows the desktop app ships, at the pixel sizes they ship at.
 * Sprite scale is always a whole multiple, so nothing softens.
 */
export const SURFACES = ["panel", "miniBar", "trayFlyout", "overlay"] as const;
export type Surface = (typeof SURFACES)[number];

export interface SurfaceSpec {
  readonly id: Surface;
  readonly label: string;
  readonly width: number;
  readonly height: number;
  /** Whole-number sprite scale. Never fractional. */
  readonly spriteScale: number;
  readonly note: string;
}

export const SURFACE_SPECS: Readonly<Record<Surface, SurfaceSpec>> = {
  panel: {
    id: "panel",
    label: "panel",
    width: 320,
    height: 450,
    spriteScale: 6,
    note: "Resizable to 380 wide; sprite stays 6x, gauge stretches.",
  },
  miniBar: {
    id: "miniBar",
    label: "mini bar",
    width: 300,
    height: 86,
    spriteScale: 2,
    note: "Always on top, snaps to screen edges, remembers position.",
  },
  trayFlyout: {
    id: "trayFlyout",
    label: "tray flyout",
    width: 280,
    height: 132,
    spriteScale: 2,
    note: "Anchored to the tray icon, dismisses on blur.",
  },
  overlay: {
    id: "overlay",
    label: "overlay",
    width: 120,
    height: 160,
    spriteScale: 4,
    note: "Transparent, click-through except on her body. No chrome.",
  },
};

/** The three mini bar sizes. Expanded only unlocks at heavy and crashed. */
export const MINI_BAR_SIZES = ["compact", "default", "expanded"] as const;
export type MiniBarSize = (typeof MINI_BAR_SIZES)[number];

export interface MiniBarSizeSpec {
  readonly id: MiniBarSize;
  readonly width: number;
  readonly height: number;
  readonly panelWidth: number;
  readonly spriteScale: number;
  readonly hasCaption: boolean;
  readonly hasButtons: boolean;
}

export const MINI_BAR_SIZE_SPECS: Readonly<Record<MiniBarSize, MiniBarSizeSpec>> = {
  compact: {
    id: "compact",
    width: 206,
    height: 56,
    panelWidth: 40,
    spriteScale: 1.5,
    hasCaption: false,
    hasButtons: false,
  },
  default: {
    id: "default",
    width: 300,
    height: 86,
    panelWidth: 56,
    spriteScale: 2,
    hasCaption: true,
    hasButtons: false,
  },
  expanded: {
    id: "expanded",
    width: 380,
    height: 116,
    panelWidth: 70,
    spriteScale: 2.5,
    hasCaption: true,
    hasButtons: true,
  },
};

/** One frame is 30x40 at 1x, aligned bottom-centre. */
export const FRAME = { width: 30, height: 40 } as const;

/** The four tabs, in order, along the bottom of the panel. */
export const TABS = ["home", "sessions", "nudges", "growth"] as const;
export type Tab = (typeof TABS)[number];
