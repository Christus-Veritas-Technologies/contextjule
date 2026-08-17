/**
 * The shape the Rust store reports.
 *
 * Lives here rather than in the desktop app because the cosmetics rules need it
 * and @contextjule/core must not depend on anything Tauri-shaped.
 */
export interface Stats {
  sessions: number;
  /** Summed peaks, not summed last-readings — this is what she carried. */
  tokensCarried: number;
  cleanses: number;
  collapses: number;
  timeTogetherMs: number;
}

export const EMPTY_STATS: Stats = {
  sessions: 0,
  tokensCarried: 0,
  cleanses: 0,
  collapses: 0,
  timeTogetherMs: 0,
};
