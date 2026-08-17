/**
 * What she is doing, and whether she says anything about it.
 *
 * This is a pure function of the session and the user's settings — no timers,
 * no state, no IPC. The caller ticks it and renders the answer. That matters
 * for three reasons: it can be tested without a desktop, all five windows can
 * run it independently and agree, and when the context reader finally lands it
 * plugs into `JuleInput` without any of this changing.
 *
 * It is also where the constants the rest of @contextjule/core defines finally
 * get used: NAP_AFTER_MS, SLEEP_AFTER_MS, CLEANSED_HOLD_MS, WARN_AT.
 */
import {
  ACTIVITY_SPECS,
  type Activity,
  CLEANSED_HOLD_MS,
  NAP_AFTER_MS,
  SLEEP_AFTER_MS,
} from "./activity";
import { type LoadState, loadStateFor, usedFraction, WARN_AT } from "./context";
import {
  type ActiveReaction,
  REACTION_SPECS,
  reactionActive,
  reactionSettling,
} from "./reactions";
import type { SpeechTone } from "./speech";

/** The five switches on the nudges screen. */
export interface NudgeSettings {
  /** At 60% and 90% of the window. */
  warnings: boolean;
  /** After two hours in one session. */
  hydration: boolean;
  /** She waves in and debriefs out. */
  rituals: boolean;
  /** She looks where you point. */
  cursor: boolean;
  /** Curls up after thirty idle minutes. */
  sleep: boolean;
}

export const DEFAULT_NUDGES: NudgeSettings = {
  warnings: true,
  hydration: true,
  rituals: true,
  cursor: false,
  sleep: true,
};

export interface JuleInput {
  now: number;
  /** Null when no session is being read — she has nothing to watch. */
  tokens: number | null;
  windowSize: number;
  /** When the current session started, for the hydration nudge. */
  sessionStartedAt: number | null;
  /** Last time the user typed into the chat. */
  lastInputAt: number | null;
  /** True while tokens are streaming in. */
  streaming: boolean;
  /** True between the prompt being sent and the first token arriving. */
  awaitingModel: boolean;
  /** Last interaction with the app or the chat, for the idle timers. */
  lastActivityAt: number;
  /** When the pack was last dumped. */
  cleansedAt: number | null;
  /** Thresholds already announced this session, so she says each once. */
  warnedAt: readonly number[];
  /** Breaks already suggested this session. */
  hydratedAt: readonly number[];
  /** True for the first few seconds after launch, for the opening ritual. */
  justOpened: boolean;
  /** Something she just did, which outranks her resting pose while it plays. */
  reaction: ActiveReaction | null;
  nudges: NudgeSettings;
}

export interface JuleSpeech {
  lines: string[];
  tone: SpeechTone;
  /** What produced it, so the caller can record that it has been said. */
  reason: "warning" | "hydration" | "ritual" | "cleanse" | "collapse";
  /** The threshold this announced, when the reason is warning or hydration. */
  at?: number;
}

export interface JuleOutput {
  load: LoadState;
  activity: Activity;
  /** Sprite action id from designs/animations/manifest.json. */
  action: string;
  /** The panel gradient behind her in the mini bar. */
  panel: string;
  /** One line for the mini bar caption. */
  caption: string;
  speech: JuleSpeech | null;
  /** True while a reaction is overriding her pose. */
  reacting: boolean;
  /**
   * True in the beat after a reaction has finished but before her resting pose
   * resumes. Callers that suppress speech or input during a reaction should
   * treat this the same way — the movement is not over yet.
   */
  settling: boolean;
}

/** Typing is "recent" for this long before she stops leaning in. */
const LISTENING_WINDOW_MS = 3_000;

/** Two hours in one session earns a suggestion to stand up. */
const HYDRATE_AFTER_MS = 2 * 60 * 60 * 1_000;

/** Above this she is visibly overloaded regardless of the raw state. */
const OVERLOAD_FRACTION = 0.9;

export function decideJule(input: JuleInput): JuleOutput {
  const live = input.tokens !== null;
  const tokens = input.tokens ?? 0;
  const load = loadStateFor(tokens);
  const used = usedFraction(tokens, input.windowSize);
  const idleFor = input.now - input.lastActivityAt;

  const activity = decideActivity(input, live, used, idleFor);
  const spec = ACTIVITY_SPECS[activity];

  // A reaction is the only thing that outranks the load state, and only for as
  // long as it plays. Everything else about her — the meter, the panel colour,
  // the caption — carries on underneath it unchanged.
  const reacting = reactionActive(input.reaction, input.now);

  // The breath afterwards. Every reaction strip ends mid-motion, so cutting
  // straight to a static load pose is a visible snap; the neutral idle loop for
  // a beat is what makes the whole thing read as one movement.
  const settling = !reacting && reactionSettling(input.reaction, input.now);

  const action = reacting
    ? REACTION_SPECS[input.reaction!.id].action
    : settling
      ? "idle"
      : decideAction(activity, load, idleFor, input.nudges.sleep);

  return {
    load,
    activity,
    action,
    panel: spec.panel,
    caption: live ? spec.caption : "Nothing to watch yet.",
    speech: decideSpeech(input, live, used, load),
    reacting,
    settling,
  };
}

function decideActivity(
  input: JuleInput,
  live: boolean,
  used: number,
  idleFor: number,
): Activity {
  // A cleanse wins over everything for four seconds. It is the one moment the
  // product exists for, and it should not be interrupted by a state change.
  if (input.cleansedAt !== null && input.now - input.cleansedAt < CLEANSED_HOLD_MS) {
    return "cleansed";
  }

  if (input.nudges.sleep && idleFor >= SLEEP_AFTER_MS) return "asleep";

  if (!live) return "idle";

  // Overload outranks streaming: near the ceiling, the warning is the message.
  if (used >= OVERLOAD_FRACTION) return "overload";

  if (input.streaming) return "streaming";
  if (input.awaitingModel) return "thinking";

  if (input.lastInputAt !== null && input.now - input.lastInputAt < LISTENING_WINDOW_MS) {
    return "listening";
  }

  return "idle";
}

/**
 * The sprite action, which is finer-grained than the activity.
 *
 * `nap` has no mini-bar activity of its own — the bar still reads "idle" — but
 * on the overlay and the panel she visibly curls up before she actually sleeps.
 */
function decideAction(
  activity: Activity,
  load: LoadState,
  idleFor: number,
  sleepEnabled: boolean,
): string {
  if (activity !== "idle") return ACTIVITY_SPECS[activity].action;
  if (sleepEnabled && idleFor >= NAP_AFTER_MS) return "nap";
  // Standing still means wearing the load state, not the generic idle loop.
  return `state-${load}`;
}

function decideSpeech(
  input: JuleInput,
  live: boolean,
  used: number,
  load: LoadState,
): JuleSpeech | null {
  // She does not talk in her sleep.
  if (input.nudges.sleep && input.now - input.lastActivityAt >= SLEEP_AFTER_MS) return null;

  if (input.cleansedAt !== null && input.now - input.cleansedAt < CLEANSED_HOLD_MS) {
    return {
      lines: ["pack empty.", "start again."],
      tone: "celebration",
      reason: "cleanse",
    };
  }

  if (input.justOpened && input.nudges.rituals) {
    return {
      lines: live ? ["morning.", "what are we", "building today?"] : ["new chat.", "what are we", "building today?"],
      tone: "normal",
      reason: "ritual",
    };
  }

  if (!live) return null;

  // Context warnings, loudest first, each said once per session.
  if (input.nudges.warnings) {
    for (const threshold of [...WARN_AT].reverse()) {
      if (used >= threshold && !input.warnedAt.includes(threshold)) {
        return {
          lines: warningLines(load, used, input.windowSize),
          tone: load === "crashed" || load === "heavy" ? "warning" : "normal",
          reason: "warning",
          at: threshold,
        };
      }
    }
  }

  // The one nudge that is not about her at all.
  if (input.nudges.hydration && input.sessionStartedAt !== null) {
    const elapsed = input.now - input.sessionStartedAt;
    const breaks = Math.floor(elapsed / HYDRATE_AFTER_MS);
    if (breaks >= 1 && !input.hydratedAt.includes(breaks)) {
      return {
        lines: ["two hours in.", "go get some water,", "i will wait."],
        tone: "normal",
        reason: "hydration",
        at: breaks,
      };
    }
  }

  return null;
}

function warningLines(load: LoadState, used: number, windowSize: number): string[] {
  const carrying = `${Math.round((used * windowSize) / 1000)}k`;
  if (load === "crashed") return [`context is at ${carrying}.`, "i am on the floor.", "clear it?"];
  if (load === "heavy") {
    return [`context is at ${carrying}.`, "my brain is melting.", "summarise and restart?"];
  }
  return [`context is at ${carrying}.`, "still fine, but", "worth knowing."];
}

/** Read the nudge switches out of the flat settings map the store returns. */
export function nudgesFromSettings(settings: Record<string, string>): NudgeSettings {
  const read = (key: keyof NudgeSettings, fallback: boolean) => {
    const value = settings[`nudges.${key === "warnings" ? "warnings" : key}`];
    return value === undefined ? fallback : value === "true";
  };
  return {
    warnings: read("warnings", DEFAULT_NUDGES.warnings),
    hydration: read("hydration", DEFAULT_NUDGES.hydration),
    rituals: read("rituals", DEFAULT_NUDGES.rituals),
    cursor: read("cursor", DEFAULT_NUDGES.cursor),
    sleep: read("sleep", DEFAULT_NUDGES.sleep),
  };
}
