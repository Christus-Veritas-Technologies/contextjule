import { createRootRoute, Outlet } from "@tanstack/react-router";

import { CrashGuard } from "../components/crash-guard";
import { LicenseProvider } from "../lib/license";

/**
 * Everything shares one licence state, and nothing else.
 *
 * The app ships five surfaces and only one has chrome: the 420x600 window's
 * title bar and tab strip live in the `_app` layout route, while the mini bar,
 * tray flyout and overlay render nothing but themselves — the overlay in
 * particular must have no plate behind her at all.
 */
export const Route = createRootRoute({
  component: () => (
    <CrashGuard>
      <LicenseProvider>
        <Outlet />
      </LicenseProvider>
    </CrashGuard>
  ),
});
