import { loadStateFor } from "@contextjule/core/context";
import { MiniBar } from "@contextjule/ui/components/mini-bar";
import { createFileRoute } from "@tanstack/react-router";

import { MOCK_SURFACE } from "../lib/mock";

export const Route = createFileRoute("/mini-bar")({ component: MiniBarSurface });

/**
 * Surface B — the mini bar, 300x86, and the surface people look at most.
 *
 * The whole window is the bar, so the plate's border is the window edge and its
 * hard shadow would fall outside the frame — hence `shadow-none` here and
 * nowhere else. The size override has to be a style rather than a class because
 * `MiniBar` sets its own width and height inline from the size spec.
 *
 * It expands to 380x116 at heavy and crashed, which is the only time the
 * cleanse button appears inline: the fix is then one click from the bar.
 */
function MiniBarSurface() {
  const load = loadStateFor(MOCK_SURFACE.tokens);
  const expanded = load === "heavy" || load === "crashed";

  return (
    <div className="h-svh w-svw" data-tauri-drag-region>
      <MiniBar
        tokens={MOCK_SURFACE.tokens}
        activity="streaming"
        size={expanded ? "expanded" : "default"}
        caption={MOCK_SURFACE.caption}
        className="shadow-none"
        style={{ width: "100vw", height: "100vh" }}
      />
    </div>
  );
}
