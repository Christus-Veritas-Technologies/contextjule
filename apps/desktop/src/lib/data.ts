import { useCallback, useEffect, useRef, useState } from "react";

import {
  type CosmeticSlot,
  earnedCosmetics,
  equippedFromSettings,
  wardrobeKey,
} from "@contextjule/core";

import * as ipc from "./ipc";

/**
 * Refresh when Rust says a session changed.
 *
 * The source readers post through a channel and the host emits
 * `session-updated`, so nothing here polls the database on a timer. Five
 * windows each on their own poll would be five times the work for strictly
 * worse latency.
 */
function useSessionEvents(reload: () => void) {
  useEffect(() => {
    if (!ipc.hasHost()) return;
    let unlisten: (() => void) | undefined;
    // `listen` resolves a tick later, so an unmount can land first. Without
    // the flag the handle arrives after cleanup has already run and the
    // listener outlives the component that wanted it — five windows opening
    // and closing surfaces all day makes that a leak, not a curiosity.
    let cancelled = false;
    void import("@tauri-apps/api/event").then(({ listen }) =>
      listen("session-updated", () => reload()).then((fn) => {
        if (cancelled) fn();
        else unlisten = fn;
      }),
    );
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [reload]);
}

/**
 * Small hooks over the local store.
 *
 * They all follow the same shape — load once, expose a `reload` — because
 * nothing here changes often enough to justify a query cache. When context
 * reading lands, the writer will emit a Tauri event and these become
 * subscriptions; the call sites will not have to change.
 */
function useAsync<T>(load: () => Promise<T>, initial: T, key = "") {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);

  /**
   * The newest loader, so `reload` can stay stable without going stale.
   *
   * `reload` is handed to an event listener and to an effect, so it has to
   * keep its identity or every store write would tear down and re-register a
   * listener. But the loader closes over its arguments, and the old version
   * captured the very first one forever: switching the sessions screen from
   * "today" to "all" changed `since` and `limit` and then re-ran a closure
   * still holding yesterday's values, so the toggle did nothing at all.
   *
   * Declared before the effect that calls it, because effects run in the
   * order they are written and this one has to be current by then.
   */
  const latest = useRef(load);
  useEffect(() => {
    latest.current = load;
  });

  const reload = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    latest
      .current()
      .then((next) => !cancelled && setData(next))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // `key` is whatever the caller's arguments amount to. Changing it refetches.
  useEffect(() => reload(), [reload, key]);
  useSessionEvents(reload);

  return { data, loading, reload };
}

export function useSessions(since?: number, limit?: number) {
  return useAsync(
    () => ipc.sessionsList(since, limit),
    [] as ipc.Session[],
    `${since ?? ""}:${limit ?? ""}`,
  );
}

export function useStats() {
  return useAsync(() => ipc.stats(), {
    sessions: 0,
    tokensCarried: 0,
    cleanses: 0,
    collapses: 0,
    timeTogetherMs: 0,
  } as ipc.Stats);
}

export function useUnlocks() {
  return useAsync(() => ipc.unlocksList(), [] as string[]);
}

/**
 * Settings, read once and written through.
 *
 * Writes are optimistic: a switch that waits for a disk round trip before it
 * moves feels broken, and the worst case is a toggle that snaps back.
 */
export function useSettings() {
  const { data, loading, reload } = useAsync(() => ipc.settingsAll(), {} as Record<string, string>);
  const [local, setLocal] = useState<Record<string, string>>({});

  useEffect(() => setLocal(data), [data]);

  const set = useCallback(async (key: string, value: string) => {
    setLocal((current) => ({ ...current, [key]: value }));
    await ipc.settingsSet(key, value);
  }, []);

  const bool = useCallback(
    (key: string, fallback: boolean) => (local[key] === undefined ? fallback : local[key] === "true"),
    [local],
  );

  return { settings: local, loading, set, bool, reload };
}

/**
 * The live session, if the reader has told us about one.
 *
 * One SQL query that filters *then* limits. The old version asked for the
 * single most recently started session and then checked whether it happened to
 * be live, which answered "nothing is running" whenever the newest session was
 * a finished one — and made her follow whichever chat was opened last rather
 * than whichever is actually moving. Anyone with two terminals open hit both.
 */
export function useCurrentSession() {
  const { data, loading, reload } = useAsync(() => ipc.sessionCurrent(), null as ipc.Session | null);
  return { session: data, loading, reload };
}

/** Which readers exist and whether their directories are there. */
export function useSources() {
  return useAsync(() => ipc.sourcesStatus(), [] as ipc.SourceStatus[]);
}

/**
 * What she is wearing, and what she has earned.
 *
 * `earned` unions the granted rows with whatever the current stats already
 * qualify for. The grant is a record of when something was reached, not the
 * gate itself — so a stats recount never takes a cosmetic away, and someone who
 * crosses a threshold sees it unlock immediately rather than on next launch.
 */
export function useWardrobe() {
  const { settings, set } = useSettings();
  const { data: stats } = useStats();
  const { data: granted, reload } = useAsync(() => ipc.unlocksList(), [] as string[]);

  const equipped = equippedFromSettings(settings);
  const earned = new Set([...granted, ...earnedCosmetics(stats)]);

  const equip = async (slot: CosmeticSlot, id: string | null) => {
    await set(wardrobeKey(slot), id ?? "");
    if (id) await ipc.unlockGrant(id);
    reload();
  };

  return { equipped, earned, stats, equip };
}
