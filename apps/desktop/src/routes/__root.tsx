import { createRootRoute, Outlet } from "@tanstack/react-router";

/**
 * Deliberately empty.
 *
 * The app ships four surfaces and only one of them has chrome. The 420x600
 * window's title bar and tab strip live in the `_app` layout route; the mini
 * bar, tray flyout and overlay are their own windows and render nothing but
 * themselves — the overlay in particular must have no plate behind her at all.
 */
export const Route = createRootRoute({
  component: () => <Outlet />,
});
