/**
 * Reactions — the transient things she does.
 *
 * The behaviour engine decides what she *is* (idle, thinking, crashed). A
 * reaction is what she just *did*: booped, caught a file, dumped the pack. It
 * overrides her pose for its own duration and then evaporates.
 *
 * Keeping the two apart is what stops a boop from being sticky and a load state
 * from being interrupted permanently. Reactions are the only thing in the whole
 * system that outranks the load state, and only for a second or two.
 */

export const REACTIONS = [
  "boop",
  "cheer",
  "catch",
  "stretch",
  "sip",
  "dump",
  "nudge",
  "crash",
  "held",
  "walk",
  "wave",
  "turn",
] as const;
export type ReactionId = (typeof REACTIONS)[number];

export interface ReactionSpec {
  readonly id: ReactionId;
  /** Sprite action from designs/animations/manifest.json. */
  readonly action: string;
  /** How long she holds it. Matches the strip's own length where it has one. */
  readonly durationMs: number;
  /** Loops for as long as the trigger lasts, rather than playing once. */
  readonly sustained: boolean;
  /** Outranks a lower-priority reaction already playing. */
  readonly priority: number;
  readonly note: string;
}

/**
 * Durations come from `frames / fps` in the manifest, rounded up a little so
 * the last frame is actually seen rather than cut off by the next state change.
 */
export const REACTION_SPECS: Readonly<Record<ReactionId, ReactionSpec>> = {
  boop: {
    id: "boop",
    action: "boop",
    durationMs: 800,
    sustained: false,
    priority: 20,
    note: "Someone clicked her. 8 frames at 12fps.",
  },
  cheer: {
    id: "cheer",
    action: "cheer",
    durationMs: 1_100,
    sustained: false,
    priority: 40,
    note: "A session ended well, or a cosmetic unlocked.",
  },
  catch: {
    id: "catch",
    action: "catch",
    durationMs: 1_100,
    sustained: false,
    priority: 50,
    note: "A file was dropped on her.",
  },
  stretch: {
    id: "stretch",
    action: "stretch",
    durationMs: 1_300,
    sustained: false,
    priority: 30,
    note: "Waking from sleep. Plays once, then back to whatever the load says.",
  },
  sip: {
    id: "sip",
    action: "sip",
    durationMs: 1_600,
    sustained: false,
    priority: 10,
    note: "A long gap between turns. The quietest thing she does.",
  },
  dump: {
    id: "dump",
    action: "dump",
    durationMs: 1_300,
    sustained: false,
    priority: 60,
    note: "The pack hits the floor. The moment the product exists for.",
  },
  nudge: {
    id: "nudge",
    action: "nudge",
    durationMs: 900,
    sustained: false,
    priority: 35,
    note: "She raised something unprompted.",
  },
  crash: {
    id: "crash",
    action: "crash",
    durationMs: 1_300,
    sustained: false,
    priority: 70,
    note: "Crossing into crashed. Plays once; the crashed pose holds after.",
  },
  held: {
    id: "held",
    action: "held",
    durationMs: 0,
    sustained: true,
    priority: 80,
    note: "Picked up by the cursor. Held until let go.",
  },
  walk: {
    id: "walk",
    action: "walk",
    durationMs: 0,
    sustained: true,
    priority: 75,
    note: "Being dragged across the desktop.",
  },
  wave: {
    id: "wave",
    action: "wave",
    durationMs: 1_100,
    sustained: false,
    priority: 25,
    note: "Launch and quit, when rituals are on.",
  },
  turn: {
    id: "turn",
    action: "turn",
    durationMs: 1_000,
    sustained: true,
    priority: 15,
    note: "Showing off gear in the wardrobe.",
  },
};

export interface ActiveReaction {
  readonly id: ReactionId;
  readonly startedAt: number;
}

/** Whether a reaction is still on screen. Sustained ones never expire on time. */
export function reactionActive(reaction: ActiveReaction | null, now: number): boolean {
  if (!reaction) return false;
  const spec = REACTION_SPECS[reaction.id];
  if (spec.sustained) return true;
  return now - reaction.startedAt < spec.durationMs;
}

/**
 * Whether a new reaction should displace the one playing.
 *
 * A dump must never be cut short by a boop, but a boop mid-sip is exactly the
 * kind of interruption that makes her feel alive — so this is priority, not
 * first-come.
 */
export function shouldReplace(
  current: ActiveReaction | null,
  next: ReactionId,
  now: number,
): boolean {
  if (!reactionActive(current, now)) return true;
  if (!current) return true;
  return REACTION_SPECS[next].priority >= REACTION_SPECS[current.id].priority;
}
