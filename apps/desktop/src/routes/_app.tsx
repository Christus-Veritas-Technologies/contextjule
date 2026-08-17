import { TABS } from "@contextjule/core/surfaces";
import { TitleBar } from "@contextjule/ui/components/window-frame";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";

import { appWindow } from "../lib/window";

/**
 * The main window, 420x600, exactly as `designs/screens/app-screens.html` draws
 * it: a 3px border, a dark title bar with three square window buttons, and a
 * four-tab strip along the bottom with the active tab in gold.
 *
 * Tauri's native decorations are off, so this chrome *is* the window — which is
 * why the title bar carries the drag region.
 */
export const Route = createFileRoute("/_app")({
  component: AppShell,
});

function AppShell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const active = pathname === "/" ? "home" : pathname.replace(/^\//, "");

  return (
    <div className="flex h-svh flex-col overflow-hidden border-3 border-ink bg-cream">
      <TitleBar
        showMark
        onMinimize={() => void appWindow()?.minimize()}
        onMaximize={() => void appWindow()?.toggleMaximize()}
        onClose={() => void appWindow()?.hide()}
      />

      <div className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </div>

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
    </div>
  );
}
