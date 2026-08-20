import { TABS } from "@contextjule/core/surfaces";
import { TitleBar } from "@contextjule/ui/components/window-frame";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Activate } from "../components/activate";
import { Onboarding } from "../components/onboarding";
import { useSettings } from "../lib/data";
import * as ipc from "../lib/ipc";
import { useLicense } from "../lib/license";
import { appWindow } from "../lib/window";

/**
 * The main window, 420x600, exactly as `designs/screens/app-screens.html` draws
 * it: a 3px border, a dark title bar with three square window buttons, and a
 * four-tab strip along the bottom with the active tab in gold.
 *
 * Tauri's native decorations are off, so this chrome *is* the window — which is
 * why the title bar carries the drag region. Closing hides into the tray, and
 * Rust intercepts the native close for the same reason.
 *
 * Three gates in order: the licence, then onboarding, then the app. Onboarding
 * comes second on purpose — there is no point explaining what she watches to
 * someone who cannot get in yet.
 */
export const Route = createFileRoute("/_app")({
  component: AppShell,
});

const ONBOARDED = "onboarding.done";

function AppShell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const active = pathname === "/" ? "home" : pathname.replace(/^\//, "");
  const { unlocked, loading } = useLicense();
  const { bool, set, loading: settingsLoading } = useSettings();

  const onboarded = bool(ONBOARDED, false);
  const ready = !loading && !settingsLoading;
  const showTabs = ready && unlocked && onboarded;

  /**
   * Only after it has plainly gone wrong.
   *
   * Both reads are local and resolve in a frame or two, so a spinner would
   * be the slowest thing about opening the app — that judgement stands. What
   * it did not cover is a read that never resolves at all, which rendered an
   * empty window with no chrome, no error and nothing to click, and is what
   * a blank ContextJule window has always been. Four seconds is far past any
   * honest local read and far short of a wait anyone would sit through.
   */
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    if (ready) return;
    const id = setTimeout(() => setStuck(true), 4_000);
    return () => clearTimeout(id);
  }, [ready]);

  return (
    <div className="flex h-svh flex-col overflow-hidden border-3 border-ink bg-cream">
      <TitleBar
        showMark
        onMinimize={() => void appWindow()?.minimize()}
        onMaximize={() => void appWindow()?.toggleMaximize()}
        onClose={() => void ipc.surfaceHide("main")}
      />

      <div className="min-h-0 flex-1 overflow-hidden">
        {/* No spinner for the normal case: both are local reads that resolve
            in a frame or two, and a flash of loading chrome would be the
            slowest part of opening the app. `stuck` is the other case. */}
        {!ready ? (
          stuck ? (
            <div className="flex h-full flex-col items-start justify-center gap-2.5 px-7">
              <span className="font-pixel text-[11px] text-ink-soft">still reading</span>
              <span className="text-[12px] leading-[1.5] text-[#6b5b48]">
                {loading ? "The licence" : "Your settings"} did not come back. That is the
                local database, so it is almost always another copy of her already
                running — check the tray.
              </span>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="cj-press mt-1 border-3 border-ink-soft bg-gold px-3.5 py-2.5 font-pixel text-[10px] text-ink-soft shadow-hard"
              >
                try again
              </button>
            </div>
          ) : null
        ) : !unlocked ? (
          <Activate />
        ) : !onboarded ? (
          <Onboarding onDone={() => void set(ONBOARDED, "true")} />
        ) : (
          <Outlet />
        )}
      </div>

      {showTabs ? (
        <nav className="flex border-t-3 border-ink bg-ink-soft">
          {TABS.map((tab) => (
            <Link
              key={tab}
              to={tab === "home" ? "/" : `/${tab}`}
              className={[
                "flex flex-1 items-center justify-center border-r-2 border-ink px-1 py-[11px] last:border-r-0",
                "font-pixel text-[9px] tracking-[0.02em] whitespace-nowrap outline-none",
                active === tab ? "bg-gold text-ink-soft" : "text-[#968fa3] hover:text-cream",
              ].join(" ")}
            >
              {tab}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
