import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * The current Tauri window, or null when the frontend is running in a plain
 * browser via `pnpm dev:frontend`. Every call site treats null as "no host",
 * so the screens can be developed and reviewed without launching Tauri.
 */
export function appWindow() {
  try {
    return getCurrentWindow();
  } catch {
    return null;
  }
}
