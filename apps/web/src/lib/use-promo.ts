"use client";

import { countdown, promoState, type PromoState } from "@contextjule/core/promo";
import { useEffect, useRef, useState } from "react";

import { API, fetchPromo } from "./api";

/**
 * The promotion, live.
 *
 * Two channels, in order of preference:
 *
 *   1. Server-sent events. One connection, pushed the moment the count moves.
 *   2. Polling every fifteen seconds, if the stream cannot be opened or keeps
 *      dying — a corporate proxy that buffers text/event-stream will hold a
 *      frame forever, and a counter frozen at 63 is worse than a slow one.
 *
 * The initial value comes from the server render, so the first paint already
 * has the right number in the button. There is no loading state on purpose:
 * the count is the headline, and a skeleton where the headline goes is the
 * worst thing this page could do.
 */
export function usePromo(initial: PromoState): PromoState {
  const [state, setState] = useState(initial);
  const latest = useRef(initial);

  useEffect(() => {
    let cancelled = false;
    let source: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    // A stream that opens and dies repeatedly is worse than no stream. Give up
    // after two failures and let polling carry it.
    let failures = 0;

    const apply = (next: PromoState) => {
      if (cancelled) return;
      latest.current = next;
      setState(next);
    };

    const startPolling = () => {
      if (pollTimer) return;
      pollTimer = setInterval(() => {
        void fetchPromo().then(apply);
      }, 15_000);
    };

    const openStream = () => {
      if (cancelled || typeof EventSource === "undefined") {
        startPolling();
        return;
      }

      source = new EventSource(`${API}/api/promo/stream`);

      source.addEventListener("promo", (event) => {
        try {
          apply(JSON.parse((event as MessageEvent).data) as PromoState);
          failures = 0;
        } catch {
          // A frame we cannot parse is not worth tearing the stream down for.
        }
      });

      source.onerror = () => {
        source?.close();
        source = null;
        failures += 1;
        if (cancelled) return;
        if (failures >= 3) {
          startPolling();
          return;
        }
        // EventSource reconnects on its own, but only for a clean drop. This
        // covers the case where it errored out for good.
        setTimeout(openStream, 3_000 * failures);
      };
    };

    openStream();

    // A tab that was in the background for an hour has a stale count and,
    // worse, a stale phase. Re-read on the way back rather than trusting
    // whatever the stream did or did not deliver while nobody was looking.
    const onVisible = () => {
      if (document.visibilityState === "visible") void fetchPromo().then(apply);
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      source?.close();
      if (pollTimer) clearInterval(pollTimer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return state;
}

/**
 * The countdown, ticked locally once a second.
 *
 * Derived from `endsAt` rather than counted down from `msRemaining`, so a tab
 * that was asleep for twenty minutes shows the right number on its first frame
 * back instead of resuming twenty minutes behind.
 */
export function useCountdown(endsAt: string | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (!endsAt) return null;
  const remaining = Date.parse(endsAt) - now;
  return Number.isNaN(remaining) ? null : countdown(remaining);
}

/**
 * The phase, re-derived on the client's own clock between updates.
 *
 * Without this the page sits in `discount` with a countdown at 00:00:00 until
 * the next stream frame arrives. The server is still the authority on what
 * anyone is charged — `POST /api/checkout` re-resolves it and returns 409 if
 * this disagrees — so this only ever changes what is drawn.
 */
export function useLivePhase(state: PromoState): PromoState {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (state.phase !== "discount") return;
    const id = setInterval(() => setTick((value) => value + 1), 1_000);
    return () => clearInterval(id);
  }, [state.phase]);

  if (state.phase !== "discount" || !state.endsAt) return state;

  // `tick` exists to re-run this on each second; the value itself is not used.
  void tick;

  const remaining = Date.parse(state.endsAt) - Date.now();
  if (Number.isNaN(remaining) || remaining > 0) return state;

  // The window has run out under us. Recompute from a record that is certain to
  // land in `full` rather than hand-building the object.
  return promoState(
    { freeLimit: state.freeLimit, freeClaimed: state.freeClaimed, freeClosedAt: new Date(0) },
    Date.now(),
  );
}
