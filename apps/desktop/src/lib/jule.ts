"use client";

import {
  type JuleOutput,
  type JuleSpeech,
  decideJule,
  nudgesFromSettings,
  SPEECH_TIMING,
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

export interface JuleController extends JuleOutput {
  /** Currently displayed speech, or null. Cleared automatically after a hold. */
  speaking: JuleSpeech | null;
  session: ReturnType<typeof useCurrentSession>["session"];
  live: boolean;
  tokens: number;
  windowSize: number;
  cleanse: () => Promise<void>;
  boop: () => void;
  dismissSpeech: () => void;
}

export function useJule(): JuleController {
  const { session, reload } = useCurrentSession();
  const { settings } = useSettings();

  const [now, setNow] = useState(() => Date.now());
  const [cleansedAt, setCleansedAt] = useState<number | null>(null);
  const [speaking, setSpeaking] = useState<JuleSpeech | null>(null);

  // Said-once bookkeeping. Refs rather than state: changing them must not
  // re-render, or announcing something would immediately re-announce it.
  const warnedAt = useRef<number[]>([]);
  const hydratedAt = useRef<number[]>([]);
  const openedAt = useRef(Date.now());
  const lastActivityAt = useRef(Date.now());
  const lastLoad = useRef<string | null>(null);

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

  // A new session is a clean slate: she gets to say everything again.
  useEffect(() => {
    warnedAt.current = [];
    hydratedAt.current = [];
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
        nudges,
      }),
    [now, tokens, windowSize, session, live, cleansedAt, nudges],
  );

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

  const cleanse = useCallback(async () => {
    if (!session) return;
    setCleansedAt(Date.now());
    lastActivityAt.current = Date.now();
    await ipc.sessionCleanse(session.id);
    reload();
  }, [session, reload]);

  const boop = useCallback(() => {
    lastActivityAt.current = Date.now();
    void ipc.eventRecord("boop", session?.id);
  }, [session]);

  return {
    ...output,
    speaking,
    session,
    live,
    tokens: tokens ?? 0,
    windowSize,
    cleanse,
    boop,
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
