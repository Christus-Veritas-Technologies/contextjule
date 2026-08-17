import { useCallback, useEffect, useState } from "react";

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
    void import("@tauri-apps/api/event").then(({ listen }) =>
      listen("session-updated", () => reload()).then((fn) => {
        unlisten = fn;
      }),
    );
    return () => unlisten?.();
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
function useAsync<T>(load: () => Promise<T>, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    load()
      .then((next) => !cancelled && setData(next))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // The caller passes a stable function; re-running on every render would
    // hammer the database.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => reload(), [reload]);
  useSessionEvents(reload);

  return { data, loading, reload };
}

export function useSessions(since?: number, limit?: number) {
  return useAsync(() => ipc.sessionsList(since, limit), [] as ipc.Session[]);
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

/** The live session, if the reader has told us about one. */
export function useCurrentSession() {
  const { data, loading, reload } = useSessions(undefined, 1);
  const current = data.find((session) => session.endedAt === null) ?? null;
  return { session: current, loading, reload };
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
