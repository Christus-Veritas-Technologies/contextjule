/**
 * The speech box. Four tones and no more.
 *
 * Every value here is lifted from `designs/screens/mini-bar-and-speech.html`.
 * Note what does and does not change between tones: the box stays cream in
 * three of the four, because the copy has to stay the easiest thing on screen
 * to read. Only the rule and the ink carry the tone.
 */
export const SPEECH_TONES = ["normal", "warning", "celebration", "thinking"] as const;
export type SpeechTone = (typeof SPEECH_TONES)[number];

export interface SpeechToneSpec {
  readonly id: SpeechTone;
  /** The width the design draws this tone at. Copy is sized to fit it. */
  readonly width: number;
  readonly bg: string;
  readonly border: string;
  /** Hard offset colour. Translucent ink, so it reads on any wallpaper. */
  readonly shadow: string;
  readonly ink: string;
  /** Thought tails are three detached squares, not a stepped wedge. */
  readonly tail: "stepped" | "dotted";
  readonly note: string;
}

export const SPEECH_TONE_SPECS: Readonly<Record<SpeechTone, SpeechToneSpec>> = {
  normal: {
    id: "normal",
    width: 190,
    bg: "#fff9f2",
    border: "#221b2c",
    shadow: "rgba(12,8,20,0.45)",
    ink: "#221b2c",
    tail: "stepped",
    note: "The default. The tail leaves the bottom-left corner four pixels in and steps down onto her hair.",
  },
  warning: {
    id: "warning",
    width: 214,
    bg: "#fff9f2",
    border: "#a03a2c",
    shadow: "rgba(143,32,24,0.4)",
    ink: "#7d2a1e",
    tail: "stepped",
    note: "Only the rule and the ink change colour. The box stays cream so the copy is still the easiest thing to read.",
  },
  celebration: {
    id: "celebration",
    width: 186,
    bg: "#f0b13f",
    border: "#221b2c",
    shadow: "rgba(12,8,20,0.45)",
    ink: "#221b2c",
    tail: "stepped",
    note: "Gold fill, tail mirrored to the bottom-right for when she is standing to the right of the box.",
  },
  thinking: {
    id: "thinking",
    width: 174,
    bg: "#f4f1ea",
    border: "#6a6478",
    shadow: "rgba(12,8,20,0.35)",
    ink: "#4a4458",
    tail: "dotted",
    note: "Three detached squares instead of a wedge. Grey rule, grey ink: she is remembering, not speaking.",
  },
};

/** Three lines maximum. Past that the panel opens instead. */
export const SPEECH_MAX_LINES = 3;

/** Copy is Silkscreen at this size. The design draws 10px and 11px; 10 is default. */
export const SPEECH_FONT_SIZE = 10;

/** Box scales up over 3 frames, the tail draws after it, holds 4s, fades over 2. */
export const SPEECH_TIMING = {
  growFrames: 3,
  holdMs: 4_000,
  fadeMs: 2_000,
} as const;

/** The stepped wedge is nine rows tall at 1x, drawn at 3x. */
export const SPEECH_TAIL_ROWS = 9;
export const SPEECH_TAIL_SCALE = 3;

export function fitsInBalloon(lines: readonly string[]): boolean {
  return lines.length > 0 && lines.length <= SPEECH_MAX_LINES;
}
