/**
 * The patrol — her resting loop when she has a stage to walk on.
 *
 * Lifted from the site hero in `designs/site/README.md`: she walks the width of
 * the band, stops, turns to face you and waves, walks back, waves again, and
 * loops. This is the same routine on the home screen and the licence screen, so
 * it lives here as a pure function of elapsed time.
 *
 * Two reasons it reads the clock rather than counting frames. A tab or a hidden
 * Tauri window throttles timers to nothing, and a counter would strand her
 * mid-step; and because every phase is derived from one number, two windows
 * running this independently stay in step without talking to each other.
 */
export const PATROL_PHASES = [
  "walk-out",
  "settle-out",
  "wave-out",
  "walk-back",
  "settle-back",
  "wave-back",
] as const;
export type PatrolPhase = (typeof PATROL_PHASES)[number];

export interface PatrolOptions {
  /** How long one crossing takes. Longer bands want a longer walk. */
  readonly walkMs?: number;
  /** The beat between arriving and waving. Without it the wave looks nervous. */
  readonly settleMs?: number;
  /** 12 frames at 12fps, plus a little so the last frame is seen. */
  readonly waveMs?: number;
}

export const PATROL_DEFAULTS = {
  walkMs: 6_000,
  settleMs: 450,
  waveMs: 1_150,
} as const;

export interface PatrolState {
  readonly phase: PatrolPhase;
  /** Sprite action for this moment. */
  readonly action: string;
  /** 0 at the left edge of her travel, 1 at the right. */
  readonly position: number;
  /**
   * Whether the strip needs flipping.
   *
   * The walk cycle is drawn once and mirrored for the other direction — the
   * design archive is explicit that there is no second strip. She faces the
   * viewer to wave, so only the walking legs mirror.
   */
  readonly mirrored: boolean;
  /** Milliseconds until the next phase, for anything that wants to anticipate. */
  readonly untilNext: number;
}

/** Total length of one full there-and-back loop. */
export function patrolDuration(options: PatrolOptions = {}): number {
  const walk = options.walkMs ?? PATROL_DEFAULTS.walkMs;
  const settle = options.settleMs ?? PATROL_DEFAULTS.settleMs;
  const wave = options.waveMs ?? PATROL_DEFAULTS.waveMs;
  return (walk + settle + wave) * 2;
}

/**
 * Where she is, and what she is doing, `elapsed` milliseconds into the loop.
 */
export function patrolAt(elapsed: number, options: PatrolOptions = {}): PatrolState {
  const walk = options.walkMs ?? PATROL_DEFAULTS.walkMs;
  const settle = options.settleMs ?? PATROL_DEFAULTS.settleMs;
  const wave = options.waveMs ?? PATROL_DEFAULTS.waveMs;

  const total = patrolDuration(options);
  const t = ((elapsed % total) + total) % total;

  // Ordered as she performs them, each with its own length and how to read
  // position within it.
  const legs: Array<{
    phase: PatrolPhase;
    action: string;
    duration: number;
    mirrored: boolean;
    at: (progress: number) => number;
  }> = [
    {
      phase: "walk-out",
      action: "walk",
      duration: walk,
      mirrored: false,
      at: (progress) => progress,
    },
    { phase: "settle-out", action: "idle", duration: settle, mirrored: false, at: () => 1 },
    { phase: "wave-out", action: "wave", duration: wave, mirrored: false, at: () => 1 },
    {
      phase: "walk-back",
      action: "walk",
      duration: walk,
      mirrored: true,
      at: (progress) => 1 - progress,
    },
    { phase: "settle-back", action: "idle", duration: settle, mirrored: true, at: () => 0 },
    { phase: "wave-back", action: "wave", duration: wave, mirrored: false, at: () => 0 },
  ];

  let cursor = 0;
  for (const leg of legs) {
    if (t < cursor + leg.duration) {
      const progress = (t - cursor) / leg.duration;
      return {
        phase: leg.phase,
        action: leg.action,
        position: leg.at(progress),
        mirrored: leg.mirrored,
        untilNext: cursor + leg.duration - t,
      };
    }
    cursor += leg.duration;
  }

  // Unreachable while the legs sum to `total`, but a sane answer beats a throw.
  return {
    phase: "walk-out",
    action: "walk",
    position: 0,
    mirrored: false,
    untilNext: walk,
  };
}
