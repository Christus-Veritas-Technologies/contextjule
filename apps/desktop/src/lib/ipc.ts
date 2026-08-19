import { invoke } from "@tauri-apps/api/core";

/**
 * The typed edge between the webview and Rust.
 *
 * Every call the frontend makes goes through here, and no SQL crosses this
 * boundary — the Rust side exposes typed commands, so the webview cannot be
 * talked into running a query, and the local schema can change without touching
 * a line of TypeScript.
 *
 * Each function degrades to a sane empty value when there is no Tauri host, so
 * the screens still render under `pnpm dev:frontend` in a plain browser.
 */

export function hasHost(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function call<T>(command: string, args: Record<string, unknown> | undefined, fallback: T): Promise<T> {
  if (!hasHost()) return fallback;
  try {
    return (await invoke<T>(command, args)) as T;
  } catch (error) {
    // A failed command is not worth crashing a desktop pet over. It is worth
    // seeing in the console, though — silent degradation hides real bugs.
    console.error(`[ipc] ${command} failed`, error);
    throw error;
  }
}

// ── identity ────────────────────────────────────────────────────────────────

export interface AppInfo {
  version: string;
  platform: "windows" | "macos" | "linux";
  machineId: string;
  deviceName: string;
}

const NO_HOST_INFO: AppInfo = {
  version: "dev",
  platform: "linux",
  machineId: "browser",
  deviceName: "Browser",
};

export const appInfo = () => call<AppInfo>("app_info", undefined, NO_HOST_INFO);

// ── settings ────────────────────────────────────────────────────────────────

export const settingsAll = () => call<Record<string, string>>("settings_all", undefined, {});
export const settingsGet = (key: string) => call<string | null>("settings_get", { key }, null);
export const settingsSet = (key: string, value: string) =>
  call<void>("settings_set", { key, value }, undefined);

// ── sessions ────────────────────────────────────────────────────────────────

export interface Session {
  id: string;
  source: string;
  title: string | null;
  model: string | null;
  windowSize: number;
  startedAt: number;
  endedAt: number | null;
  lastTokens: number;
  peakTokens: number;
  cleanses: number;
  collapses: number;
  updatedAt: number;
}

export interface SessionUpsert {
  id: string;
  source: string;
  title?: string | null;
  model?: string | null;
  windowSize?: number | null;
  tokens: number;
}

export const sessionUpsert = (input: SessionUpsert) =>
  call<Session | null>("session_upsert", { input }, null);
export const sessionsList = (since?: number, limit?: number) =>
  call<Session[]>("sessions_list", { since: since ?? null, limit: limit ?? null }, []);
/**
 * The one session she is watching: the most recently written-to live one.
 *
 * A command rather than a filter over `sessionsList`, because the filter has
 * to run before the LIMIT and only SQL can do that.
 */
export const sessionCurrent = () => call<Session | null>("session_current", undefined, null);
export const sessionEnd = (id: string) => call<void>("session_end", { id }, undefined);
export const sessionCleanse = (id: string) => call<void>("session_cleanse", { id }, undefined);

/**
 * Record a session crossing into `crashed`.
 *
 * Called on the crossing itself, not on every tick above the threshold — the
 * growth screen counts collapses, and counting one per second while somebody
 * sits at 130k would make that number meaningless.
 */
export const sessionCollapse = (id: string, tokens: number) =>
  call<void>("session_collapse", { id, tokens }, undefined);

/**
 * Close sessions that have been idle too long.
 *
 * The Rust side runs this on a timer as well; this is the manual handle, for a
 * screen that wants the number to be right now rather than within a minute.
 * Returns how many were closed.
 */
export const sessionsCloseStale = (idleForMs: number) =>
  call<number>("sessions_close_stale", { idleForMs }, 0);
export const eventRecord = (kind: string, sessionId?: string, tokens?: number) =>
  call<void>("event_record", { kind, sessionId: sessionId ?? null, tokens: tokens ?? null }, undefined);

export interface Stats {
  sessions: number;
  tokensCarried: number;
  cleanses: number;
  collapses: number;
  timeTogetherMs: number;
}

const EMPTY_STATS: Stats = {
  sessions: 0,
  tokensCarried: 0,
  cleanses: 0,
  collapses: 0,
  timeTogetherMs: 0,
};

export const stats = () => call<Stats>("stats", undefined, EMPTY_STATS);
export const unlocksList = () => call<string[]>("unlocks_list", undefined, []);
export const unlockGrant = (id: string) => call<void>("unlock_grant", { id }, undefined);

// ── licence ─────────────────────────────────────────────────────────────────

export interface LicenseState {
  status:
    | "unlicensed"
    | "active"
    | "expired"
    | "revoked"
    | "limit_reached"
    | "offline_grace"
    | "invalid";
  licenseKey: string | null;
  licenseKeyInstanceId: string | null;
  email: string | null;
  activationsUsed: number | null;
  activationsLimit: number | null;
  expiresAt: string | null;
  lastValidatedAt: string | null;
}

/**
 * With no Tauri host there is nothing to unlock — `dev:frontend` is for looking
 * at screens, so it reports active rather than trapping you behind a key field.
 */
const NO_HOST_LICENSE: LicenseState = {
  status: "active",
  licenseKey: null,
  licenseKeyInstanceId: null,
  email: null,
  activationsUsed: null,
  activationsLimit: null,
  expiresAt: null,
  lastValidatedAt: new Date().toISOString(),
};

export const licenseGet = () => call<LicenseState>("license_get", undefined, NO_HOST_LICENSE);
export const licenseActivate = (licenseKey: string) =>
  call<LicenseState>("license_activate", { licenseKey }, NO_HOST_LICENSE);
export const licenseValidate = () => call<LicenseState>("license_validate", undefined, NO_HOST_LICENSE);
export const licenseDeactivate = () =>
  call<LicenseState>("license_deactivate", undefined, NO_HOST_LICENSE);

// ── sources ─────────────────────────────────────────────────────────────────

export interface SourceStatus {
  id: string;
  label: string;
  available: boolean;
  root: string | null;
  lastReadingAt: number | null;
}

export const sourcesStatus = () => call<SourceStatus[]>("sources_status", undefined, []);

/** Whether ContextJule is currently Claude Code's status line command. */
export const statuslineInstalled = () => call<boolean>("statusline_installed", undefined, false);
export const statuslineInstall = () => call<void>("statusline_install", undefined, undefined);
export const statuslineUninstall = () => call<void>("statusline_uninstall", undefined, undefined);

// ── windows ─────────────────────────────────────────────────────────────────

export type Surface = "main" | "panel" | "mini-bar" | "tray-flyout" | "overlay";

export const surfaceShow = (label: Surface) => call<void>("surface_show", { label }, undefined);
export const surfaceHide = (label: Surface) => call<void>("surface_hide", { label }, undefined);
export const surfaceToggle = (label: Surface) => call<boolean>("surface_toggle", { label }, false);
export const surfaceClickThrough = (label: Surface, ignore: boolean) =>
  call<void>("surface_click_through", { label, ignore }, undefined);

export const surfaceVisible = (label: Surface) =>
  call<boolean>("surface_visible", { label }, false);

/**
 * Show or hide a surface *and remember the choice*.
 *
 * Distinct from `surfaceShow`/`surfaceHide`, which are momentary. This is what
 * the nudges screen's toggles call, so a window the user turned off stays off
 * across a restart rather than reappearing on next launch.
 */
export const surfaceSetVisible = (label: Surface, visible: boolean) =>
  call<void>("surface_set_visible", { label, visible }, undefined);

/**
 * Snap a window to the nearest screen edge if it is within `threshold` pixels.
 * Called on drag release, which is the only moment it makes sense.
 */
export const surfaceSnap = (label: Surface, threshold = 24) =>
  call<void>("surface_snap", { label, threshold }, undefined);

// ── system ──────────────────────────────────────────────────────────────────

export const autostartEnabled = () => call<boolean>("autostart_enabled", undefined, false);
export const autostartSet = (enabled: boolean) =>
  call<void>("autostart_set", { enabled }, undefined);

/**
 * Put text on the clipboard.
 *
 * Used for exactly one thing: handing over a `/clear` when someone taps the
 * cleanse button. She cannot reach into their chat, so the honest version of
 * "help her carry this" is to put the command where they can paste it.
 */
export async function writeClipboard(text: string): Promise<boolean> {
  if (!hasHost()) return false;
  try {
    const { writeText } = await import("@tauri-apps/plugin-clipboard-manager");
    await writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Physical screen coordinates of the cursor. Cursor-follow only. */
export const cursorPosition = () => call<[number, number]>("cursor_position", undefined, [0, 0]);

/** A window's outer position and size: [x, y, width, height]. */
export const surfacePosition = (label: Surface) =>
  call<[number, number, number, number]>("surface_position", { label }, [0, 0, 0, 0]);

/** Sets the tray badge and broadcasts to the other windows. */
export const setLoadState = (state: string) => call<void>("set_load_state", { state }, undefined);
