/**
 * Context load: the one number that decides whether a session is going well.
 * Everything visible in the product — her pose, the meter colour, the tray pip,
 * whether she speaks up — is derived from this module.
 */

export const LOAD_STATES = ["fresh", "loaded", "heavy", "crashed"] as const;
export type LoadState = (typeof LOAD_STATES)[number];

export interface LoadStateSpec {
  readonly id: LoadState;
  readonly label: string;
  /** Inclusive lower bound, in tokens. */
  readonly from: number;
  /** Exclusive upper bound, in tokens. `Infinity` on the last state. */
  readonly to: number;
  /** The character accent: her pose, the tray pip, the state sprite. */
  readonly accent: string;
  /** The meter fill. Diverges from `accent` at heavy and crashed on purpose. */
  readonly meter: string;
  /** The state label as it reads on a cream surface. */
  readonly labelColor: string;
  /** How she is carrying it, one line. */
  readonly note: string;
}

export const LOAD_STATE_SPECS: Readonly<Record<LoadState, LoadStateSpec>> = {
  fresh: {
    id: "fresh",
    label: "fresh",
    from: 0,
    to: 5_000,
    accent: "#7bbf6a",
    meter: "#7bbf6a",
    labelColor: "#2c6b28",
    note: "Standing tall, tails up, small pack, easy smile.",
  },
  loaded: {
    id: "loaded",
    label: "loaded",
    from: 5_000,
    to: 32_000,
    accent: "#f0b13f",
    meter: "#f0b13f",
    labelColor: "#a8621c",
    note: "Wider stance, pack stuffed with scrolls, focused.",
  },
  heavy: {
    id: "heavy",
    label: "heavy",
    from: 32_000,
    to: 128_000,
    accent: "#e08a3a",
    meter: "#e04a4a",
    labelColor: "#a03a2c",
    note: "Knees bent, pack towering, brow down.",
  },
  crashed: {
    id: "crashed",
    label: "crashed",
    from: 128_000,
    to: Number.POSITIVE_INFINITY,
    accent: "#e04a4a",
    meter: "#8f2018",
    labelColor: "#8f2018",
    note: "Face down, pack toppled.",
  },
};

/** Which state a raw token count falls in. */
export function loadStateFor(tokens: number): LoadState {
  // NaN and negatives are bad readings and must not alarm anyone. Infinity is
  // not the same case: a count that has run away is the *most* alarming thing
  // there is, and it falls through to `crashed` below on purpose.
  if (Number.isNaN(tokens) || tokens < 0) return "fresh";
  if (tokens >= LOAD_STATE_SPECS.crashed.from) return "crashed";
  if (tokens >= LOAD_STATE_SPECS.heavy.from) return "heavy";
  if (tokens >= LOAD_STATE_SPECS.loaded.from) return "loaded";
  return "fresh";
}

export function loadSpecFor(tokens: number): LoadStateSpec {
  return LOAD_STATE_SPECS[loadStateFor(tokens)];
}

/** Context windows we know how to read, largest sensible default first. */
export const CONTEXT_WINDOWS = {
  "claude-opus": 200_000,
  "claude-sonnet": 200_000,
  "gpt-5": 400_000,
  "gpt-4o": 128_000,
  "gemini-pro": 1_000_000,
  default: 200_000,
} as const;

export type ContextWindowKey = keyof typeof CONTEXT_WINDOWS;

export function contextWindowFor(model: string | null | undefined): number {
  if (!model) return CONTEXT_WINDOWS.default;
  const key = model.toLowerCase();
  for (const [name, size] of Object.entries(CONTEXT_WINDOWS)) {
    if (name !== "default" && key.includes(name)) return size;
  }
  return CONTEXT_WINDOWS.default;
}

/** The meter is always fourteen segments wide. */
export const METER_SEGMENTS = 14;

/** Inactive segment fill. Cool grey so the filled run reads as the only colour. */
export const METER_EMPTY = "#dbe6ef";

export interface MeterSegment {
  readonly index: number;
  readonly filled: boolean;
  readonly fill: string;
}

/**
 * Fourteen segments, filled proportionally. One token in shows one segment, so
 * the bar never reads as empty while a session is live.
 */
export function meterSegments(
  tokens: number,
  windowSize: number = CONTEXT_WINDOWS.default,
  segments: number = METER_SEGMENTS,
): MeterSegment[] {
  const spec = loadSpecFor(tokens);
  const ratio = windowSize > 0 ? Math.min(1, Math.max(0, tokens / windowSize)) : 0;
  const raw = ratio * segments;
  const filled = tokens > 0 ? Math.max(1, Math.round(raw)) : 0;
  return Array.from({ length: segments }, (_, index) => ({
    index,
    filled: index < filled,
    fill: index < filled ? spec.meter : METER_EMPTY,
  }));
}

/** Fraction of the window used, clamped to 0..1. */
export function usedFraction(tokens: number, windowSize: number = CONTEXT_WINDOWS.default): number {
  if (windowSize <= 0) return 0;
  return Math.min(1, Math.max(0, tokens / windowSize));
}

/** The two points she is allowed to speak up unprompted about load. */
export const WARN_AT = [0.6, 0.9] as const;

export function shouldWarn(
  tokens: number,
  windowSize: number,
  alreadyWarnedAt: readonly number[] = [],
): number | null {
  const used = usedFraction(tokens, windowSize);
  for (const threshold of [...WARN_AT].reverse()) {
    if (used >= threshold && !alreadyWarnedAt.includes(threshold)) return threshold;
  }
  return null;
}
