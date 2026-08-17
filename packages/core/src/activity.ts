/**
 * What she is doing right now, as distinct from how much she is carrying.
 * The load state owns the meter; the activity owns her frame, the panel colour
 * behind her, and the caption. They change independently.
 */
import type { LoadState } from "./context";

export const ACTIVITIES = [
  "idle",
  "listening",
  "thinking",
  "streaming",
  "overload",
  "cleansed",
  "asleep",
] as const;
export type Activity = (typeof ACTIVITIES)[number];

/** Panel gradients behind her in the mini bar. */
export const PANEL = {
  sky: "linear-gradient(#5fbcec,#9adcf3)",
  dusk: "linear-gradient(#8b79c4,#b3a2de)",
  warn: "linear-gradient(#d4703a,#eda558)",
  night: "linear-gradient(#3f4a78,#6672a4)",
} as const;

export interface ActivitySpec {
  readonly id: Activity;
  readonly label: string;
  /** Sprite action id from `designs/animations/manifest.json`. */
  readonly action: string;
  readonly panel: string;
  readonly labelColor: string;
  readonly caption: string;
  readonly note: string;
}

export const ACTIVITY_SPECS: Readonly<Record<Activity, ActivitySpec>> = {
  idle: {
    id: "idle",
    label: "idle",
    action: "idle",
    panel: PANEL.sky,
    labelColor: "#14567e",
    caption: "Waiting on you.",
    note: "The resting loop. Everything settles back to this.",
  },
  listening: {
    id: "listening",
    label: "listening",
    action: "listen",
    panel: PANEL.sky,
    labelColor: "#14567e",
    caption: "You are typing. She is leaning in.",
    note: "Ear turned toward you while the prompt is being written.",
  },
  thinking: {
    id: "thinking",
    label: "thinking",
    action: "think",
    panel: PANEL.dusk,
    labelColor: "#4b3a7a",
    caption: "Model is working.",
    note: "Dusk panel, so the wait reads differently from the idle sky.",
  },
  streaming: {
    id: "streaming",
    label: "streaming",
    action: "type",
    panel: PANEL.sky,
    labelColor: "#14567e",
    caption: "Tokens coming in.",
    note: "She types along at her desk and the meter ticks up live.",
  },
  overload: {
    id: "overload",
    label: "overload",
    action: "zap",
    panel: PANEL.warn,
    labelColor: "#a03a2c",
    caption: "Near the ceiling. Ask her first.",
    note: "The only state that changes the panel colour to warn you.",
  },
  cleansed: {
    id: "cleansed",
    label: "cleansed",
    action: "sweep",
    panel: PANEL.sky,
    labelColor: "#2c6b28",
    caption: "Pack empty. Start again.",
    note: "Held for four seconds after a cleanse, then it falls back to fresh.",
  },
  asleep: {
    id: "asleep",
    label: "asleep",
    action: "bed",
    panel: PANEL.night,
    labelColor: "#3d3760",
    caption: "Idle. She went to bed.",
    note: "Night panel, empty meter, no number. Nothing is being watched.",
  },
};

/** How long the cleansed state is held before it falls back to fresh. */
export const CLEANSED_HOLD_MS = 4_000;

/** Idle timeout before she naps, then sleeps. */
export const NAP_AFTER_MS = 10 * 60_000;
export const SLEEP_AFTER_MS = 30 * 60_000;

/**
 * The state sprite when she is standing still, the activity sprite when she is
 * doing something. Overload wins over everything except sleep.
 */
export function spriteActionFor(activity: Activity, load: LoadState): string {
  if (activity === "asleep") return "bed";
  if (activity === "idle") return `state-${load}`;
  return ACTIVITY_SPECS[activity].action;
}
