"use client";

import { useCallback, useState } from "react";

import { hasHost } from "./ipc";

/**
 * Updates.
 *
 * The manifest lives at a fixed URL in R2 that every release overwrites, and
 * the artifacts are signed with a key whose public half is baked into the
 * binary — so an update that did not come from our release workflow will not
 * install, even if someone can serve the manifest.
 *
 * Checking is manual on purpose. A desktop pet that restarts itself while you
 * are mid-conversation is a worse citizen than one that waits to be asked.
 */
export type UpdateStatus =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "none" }
  | { kind: "available"; version: string; notes: string }
  | { kind: "downloading"; percent: number }
  | { kind: "ready" }
  | { kind: "error"; message: string };

export function useUpdater() {
  const [status, setStatus] = useState<UpdateStatus>({ kind: "idle" });

  const check = useCallback(async () => {
    if (!hasHost()) {
      setStatus({ kind: "none" });
      return;
    }
    setStatus({ kind: "checking" });
    try {
      const { check: checkUpdate } = await import("@tauri-apps/plugin-updater");
      const update = await checkUpdate();
      if (!update) {
        setStatus({ kind: "none" });
        return;
      }
      setStatus({ kind: "available", version: update.version, notes: update.body ?? "" });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : String(error) });
    }
  }, []);

  const install = useCallback(async () => {
    if (!hasHost()) return;
    try {
      const { check: checkUpdate } = await import("@tauri-apps/plugin-updater");
      const update = await checkUpdate();
      if (!update) {
        setStatus({ kind: "none" });
        return;
      }

      let total = 0;
      let received = 0;
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
          setStatus({ kind: "downloading", percent: 0 });
        } else if (event.event === "Progress") {
          received += event.data.chunkLength;
          setStatus({
            kind: "downloading",
            percent: total > 0 ? Math.round((received / total) * 100) : 0,
          });
        } else if (event.event === "Finished") {
          setStatus({ kind: "ready" });
        }
      });

      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : String(error) });
    }
  }, []);

  return { status, check, install };
}
