import { MiniBar } from "@contextjule/ui/components/mini-bar";
import { createFileRoute } from "@tanstack/react-router";

import { useWindowDrag } from "../lib/drag";
import { hasHost } from "../lib/ipc";
import * as ipc from "../lib/ipc";
import { useJule } from "../lib/jule";
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
  const jule = useJule();
  const drag = useWindowDrag("mini-bar");
  const sample = !jule.live && !hasHost();
  const expanded = jule.load === "heavy" || jule.load === "crashed";

  return (
    <div className="h-svh w-svw" {...drag}>
      <MiniBar
        tokens={sample ? MOCK_SURFACE.tokens : jule.tokens}
        windowSize={jule.windowSize}
        activity={jule.activity}
        size={expanded ? "expanded" : "default"}
        caption={jule.speaking ? jule.speaking.lines.join(" ") : undefined}
        className="shadow-none"
        style={{ width: "100vw", height: "100vh" }}
        onCleanse={() => void jule.cleanse()}
        onDismiss={() => void ipc.surfaceSetVisible("mini-bar", false)}
      />
    </div>
  );
}
