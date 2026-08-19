import { LOAD_STATE_SPECS } from "@contextjule/core/context";
import { formatTokens } from "@contextjule/core/format";
import { Meter } from "@contextjule/ui/components/meter";
import { Sprite } from "@contextjule/ui/components/sprite";
import { TitleBar } from "@contextjule/ui/components/window-frame";
import { createFileRoute } from "@tanstack/react-router";

import * as ipc from "../lib/ipc";
import { useJule } from "../lib/jule";
import { MOCK_SURFACE } from "../lib/mock";

export const Route = createFileRoute("/tray")({ component: TrayFlyout });

/**
 * Surface C — the tray flyout, 280x132.
 *
 * Left-clicking the tray icon toggles it, and it dismisses on blur, so the two
 * window buttons are there to match the rest of the chrome rather than because
 * anyone is expected to reach for them.
 */
function TrayFlyout() {
  const jule = useJule();
  const sample = !jule.live && !ipc.hasHost();

  const live = jule.live;
  const tokens = sample ? MOCK_SURFACE.tokens : jule.tokens;
  const windowSize = jule.windowSize;
  const load = LOAD_STATE_SPECS[jule.load];

  return (
    <div className="flex h-svh flex-col overflow-hidden border-3 border-ink bg-sky">
      <TitleBar buttons={2} onClose={() => void ipc.surfaceHide("tray-flyout")} />

      <div
        className="flex flex-1 flex-col gap-[11px] px-3.5 py-[13px]"
        style={{ background: "linear-gradient(#dff2fb,#b9e4f6)" }}
      >
        <div className="flex items-center gap-3">
          <Sprite action={jule.action} scale={2} fx={false} />
          <div className="flex flex-col gap-1">
            <span className="font-pixel text-[11px] text-[#12283d]">{load.label}</span>
            <span className="text-[11px] text-[#3d4f61]">
              {live
                ? `${formatTokens(tokens)} of ${Math.round(windowSize / 1000)}k used`
                : "nothing being watched"}
            </span>
          </div>
        </div>

        <Meter
          tokens={tokens}
          windowSize={windowSize}
          filled={sample ? MOCK_SURFACE.meterFilled : undefined}
          segmentHeight={11}
          gap={2}
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              void ipc.surfaceShow("panel");
              void ipc.surfaceHide("tray-flyout");
            }}
            className="cj-press flex h-8 flex-1 items-center justify-center border-3 border-[#12283d] bg-[#fffdf8] font-pixel text-[9px] whitespace-nowrap text-[#12283d]"
            style={{ boxShadow: "3px 3px 0 rgba(18,40,61,0.28)" }}
          >
            open panel
          </button>
          <button
            type="button"
            onClick={() => void jule.cleanse()}
            title={`Copies ${jule.clearCommand} to your clipboard`}
            className="cj-press flex h-8 flex-1 items-center justify-center border-3 border-[#12283d] bg-gold font-pixel text-[9px] whitespace-nowrap text-ink-soft hover:bg-gold-hover"
            style={{ boxShadow: "3px 3px 0 rgba(18,40,61,0.28)" }}
          >
            {/* "clear" promised something no window can do from outside. */}
            {jule.handedOver ? "copied" : `copy ${jule.clearCommand}`}
          </button>
        </div>
      </div>
    </div>
  );
}
