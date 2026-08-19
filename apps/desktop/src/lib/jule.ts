"use client";

import {
  type ActiveReaction,
  type JuleOutput,
  type JuleSpeech,
  type LoadState,
  type ReactionId,
  decideJule,
  gateTransition,
  loadStateFor,
  nudgesFromSettings,
  REACTION_SETTLE_MS,
  REACTION_SPECS,
  shouldReplace,
  SPEECH_TIMING,
  type TransitionGate,
} from "@contextjule/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useCurrentSession, useSettings } from "./data";
import * as ipc from "./ipc";

/**
 * Her behaviour, running on a one-second tick.
 *
 * The decision itself is a pure function in @contextjule/core; everything here
 * is the bookkeeping around it — what has already been said, when the pack was
 * last dumped, how long since anyone touched anything. Every window runs its
 * own copy and they agree, because the same inputs produce the same answer.
 *
 * A second is the right cadence. Her slowest animation is 5fps and her state
 * thresholds are thousands of tokens apart, so anything faster is spending
 * battery to redraw the same frame.
 */
const TICK_MS = 1_000;

/** How long after launch the opening ritual is still "just opened". */
const RITUAL_WINDOW_MS = 6_000;

/** A session touched this recently is mid-stream. */
const STREAMING_WINDOW_MS = 2_000;

/**
 * What "help her carry this" actually does.
 *
 * She cannot reach into anyone's chat and clear it — nothing outside the tool
 * can, and a button that pretended otherwise would be the one dishonest thing
 * in the product. So the button hands over the command instead: one click, on
 * your clipboard, paste it where it belongs.
 */
const CLEAR_COMMAND = "/clear";

/** How long the surfaces say the command is waiting on the clipboard. */
const HANDOVER_HOLD_MS = 4_000;

export interface JuleController extends JuleOutput {
  /** Currently displayed speech, or null. Cleared automatically after a hold. */
  speaking: JuleSpeech | null;
  session: ReturnType<typeof useCurrentSession>["session"];
  live: boolean;
  tokens: number;
  windowSize: number;
  cleanse: () => Promise<void>;
  /** True for a few seconds after a cleanse put `/clear` on the clipboard. */
  handedOver: boolean;
  /** The command a cleanse hands over, so surfaces can name it exactly. */
  clearCommand: string;
  boop: () => void;
  /** Play a reaction. Higher-priority ones interrupt whatever is running. */
  react: (id: ReactionId) => void;
  /** Stop a sustained reaction — drag ended, wardrobe closed. */
  endReaction: (id: ReactionId) => void;
  dismissSpeech: () => void;
}

export function useJule(): JuleController {
  const { session, reload } = useCurrentSession();
  const { settings } = useSettings();

  const [now, setNow] = useState(() => Date.now());
  const [cleansedAt, setCleansedAt] = useState<number | null>(null);
  const [handedOverAt, setHandedOverAt] = useState<number | null>(null);
  const [speaking, setSpeaking] = useState<JuleSpeech | null>(null);
  const [reaction, setReaction] = useState<ActiveReaction | null>(null);

  // Said-once bookkeeping. Refs rather than state: changing them must not
  // re-render, or announcing something would immediately re-announce it.
  const warnedAt = useRef<number[]>([]);
  const hydratedAt = useRef<number[]>([]);
  const openedAt = useRef(Date.now());
  const lastActivityAt = useRef(Date.now());
  const lastLoad = useRef<string | null>(null);

  /**
   * The load state she is currently *drawn* as, plus when she last moved.
   *
   * Not the same thing as the load state the meter reports. The meter follows
   * the raw count immediately; she is allowed to lag behind it by up to a
   * second and a half while a transition plays out. Keeping the two apart is
   * what stops a count hovering on a band boundary from making her twitch.
   */
  const gate = useRef<TransitionGate>({ current: "fresh", lastFiredAt: null });
  /** Whether a load state has been seen at all — the first is not a crossing. */
  const seenLoad = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Any real interaction resets the idle timers, which is what stops her
  // napping while someone is plainly using the machine.
  useEffect(() => {
    const wake = () => {
      lastActivityAt.current = Date.now();
    };
    const events = ["pointerdown", "keydown", "wheel", "focus"] as const;
    for (const event of events) window.addEventListener(event, wake, { passive: true });
    return () => {
      for (const event of events) window.removeEventListener(event, wake);
    };
  }, []);

  // A new session is a clean slate: she gets to say everything again, and she
  // starts from wherever the new session actually is rather than animating a
  // crossing that never happened.
  useEffect(() => {
    warnedAt.current = [];
    hydratedAt.current = [];
    seenLoad.current = false;
  }, [session?.id]);

  const nudges = useMemo(() => nudgesFromSettings(settings), [settings]);

  const live = session !== null;
  const tokens = session?.lastTokens ?? null;
  const windowSize = session?.windowSize ?? 200_000;

  const output = useMemo(
    () =>
      decideJule({
        now,
        tokens,
        windowSize,
        sessionStartedAt: session?.startedAt ?? null,
        // Until the reader lands there is nothing finer-grained than "the row
        // changed recently", which is exactly what streaming looks like.
        lastInputAt: null,
        streaming: live && now - (session?.updatedAt ?? 0) < STREAMING_WINDOW_MS,
        awaitingModel: false,
        lastActivityAt: lastActivityAt.current,
        cleansedAt,
        warnedAt: warnedAt.current,
        hydratedAt: hydratedAt.current,
        justOpened: now - openedAt.current < RITUAL_WINDOW_MS,
        reaction,
        nudges,
      }),
    [now, tokens, windowSize, session, live, cleansedAt, reaction, nudges],
  );

  const react = useCallback((id: ReactionId) => {
    lastActivityAt.current = Date.now();
    setReaction((current) =>
      shouldReplace(current, id, Date.now()) ? { id, startedAt: Date.now() } : current,
    );
  }, []);

  const endReaction = useCallback((id: ReactionId) => {
    setReaction((current) => (current?.id === id ? null : current));
  }, []);

  /**
   * Clear a finished one-shot so her resting pose resumes.
   *
   * Held for the settle window past the strip's own length, not cut at it.
   * Every reaction ends mid-motion — `dump` finishes with her still bent over
   * the pack — and `decideJule` uses that window to play the neutral idle loop
   * instead of snapping straight to a static load pose.
   */
  useEffect(() => {
    if (!reaction) return;
    const spec = REACTION_SPECS[reaction.id];
    if (spec.sustained) return;
    const total = spec.durationMs + REACTION_SETTLE_MS;
    const remaining = total - (Date.now() - reaction.startedAt);
    const id = setTimeout(() => setReaction(null), Math.max(0, remaining));
    return () => clearTimeout(id);
  }, [reaction]);

  /**
   * The context window moving under her.
   *
   * Every band crossing gets a beat — she rolls a shoulder under new weight,
   * stretches when it comes off, goes down properly when she hits crashed, and
   * cheers when a cleanse lands her back at fresh. `gateTransition` is what
   * decides whether a crossing is real: a count flickering across 32,000 by six
   * tokens is not a transition, and firing one for it would leave her twitching
   * between animations forever.
   *
   * Crossing several bands at once plays one reaction for where she landed, not
   * one per band. Four animations queued back to back is a cutscene, not a
   * transition.
   */
  useEffect(() => {
    if (tokens === null || !session) return;
    const next: LoadState = loadStateFor(tokens);

    // The first reading of a session is where she starts, not somewhere she
    // travelled to. Animating into it would mean she nudges every time the app
    // opens onto a busy session.
    if (!seenLoad.current) {
      seenLoad.current = true;
      gate.current = { current: next, lastFiredAt: null };
      return;
    }

    const at = Date.now();
    const transition = gateTransition(gate.current, next, at);
    if (!transition) return;

    gate.current = { current: next, lastFiredAt: at };
    if (transition.reaction) react(transition.reaction);

    // Recorded once, on the crossing itself — the same edge she animates.
    if (transition.to === "crashed") void ipc.sessionCollapse(session.id, tokens);
  }, [tokens, session, react]);

  // Raise anything new she has to say, and record it so it is said once.
  useEffect(() => {
    if (!output.speech) return;
    const speech = output.speech;
    if (speech.reason === "warning" && speech.at !== undefined) {
      if (warnedAt.current.includes(speech.at)) return;
      warnedAt.current = [...warnedAt.current, speech.at];
    }
    if (speech.reason === "hydration" && speech.at !== undefined) {
      if (hydratedAt.current.includes(speech.at)) return;
      hydratedAt.current = [...hydratedAt.current, speech.at];
    }
    setSpeaking(speech);
    const id = setTimeout(() => setSpeaking(null), SPEECH_TIMING.holdMs + SPEECH_TIMING.fadeMs);
    return () => clearTimeout(id);
  }, [output.speech]);

  // The tray badge and the other windows follow whatever this decides. Only on
  // change — setting it every tick would repaint the tray once a second.
  useEffect(() => {
    const next = output.activity === "asleep" ? "asleep" : output.load;
    if (lastLoad.current === next) return;
    lastLoad.current = next;
    void ipc.setLoadState(next);
  }, [output.load, output.activity]);

  /**
   * Hand over the command, and record the cleanse if there is one to record.
   *
   * Deliberately not gated on a live session. The clipboard hand-off is the
   * whole of what the button can do, and it is just as useful before she has
   * found anything to watch — which is exactly when a disabled control reads
   * as a broken one. The bookkeeping below is what needs a session, not the
   * action the user asked for.
   */
  const cleanse = useCallback(async () => {
    lastActivityAt.current = Date.now();
    react("dump");
    // The dump IS the transition down. Arm the gate so the drop to `fresh` that
    // follows does not immediately queue a `cheer` on top of it.
    gate.current = { current: "fresh", lastFiredAt: Date.now() };

    if (await ipc.writeClipboard(CLEAR_COMMAND)) setHandedOverAt(Date.now());

    if (!session) return;
    setCleansedAt(Date.now());
    await ipc.sessionCleanse(session.id);
    reload();
  }, [session, reload, react]);

  // The confirmation is a message, not a mode: it says its piece and goes.
  useEffect(() => {
    if (handedOverAt === null) return;
    const id = setTimeout(() => setHandedOverAt(null), HANDOVER_HOLD_MS);
    return () => clearTimeout(id);
  }, [handedOverAt]);

  const boop = useCallback(() => {
    lastActivityAt.current = Date.now();
    react("boop");
    void ipc.eventRecord("boop", session?.id);
  }, [session, react]);

  return {
    ...output,
    speaking,
    session,
    live,
    tokens: tokens ?? 0,
    windowSize,
    cleanse,
    handedOver: handedOverAt !== null,
    clearCommand: CLEAR_COMMAND,
    boop,
    react,
    endReaction,
    dismissSpeech: () => setSpeaking(null),
  };
}

/**
 * Subscribe to the load state the Rust side broadcasts.
 *
 * The compact surfaces are separate webviews with their own copy of everything,
 * so without this they would each decide independently and drift apart by a
 * tick. One window decides; the rest listen.
 */
export function useLoadStateEvent(onChange: (state: string) => void) {
  useEffect(() => {
    if (!ipc.hasHost()) return;
    let unlisten: (() => void) | undefined;
    void import("@tauri-apps/api/event").then(({ listen }) =>
      listen<string>("load-state", (event) => onChange(event.payload)).then((fn) => {
        unlisten = fn;
      }),
    );
    return () => unlisten?.();
  }, [onChange]);
}
