import { Meter } from "@contextjule/ui/components/meter";
import { Sprite } from "@contextjule/ui/components/sprite";
import { TitleBar } from "@contextjule/ui/components/window-frame";
import { createFileRoute } from "@tanstack/react-router";

import { appWindow } from "../lib/window";
import { MOCK_SURFACE } from "../lib/mock";

export const Route = createFileRoute("/tray")({ component: TrayFlyout });

/**
 * Surface C — the tray flyout, 280x132.
 *
 * Anchored to the tray icon and dismissed on blur, so it never needs a close
 * affordance of its own — the two window buttons are there to match the rest of
 * the chrome, not because anyone is expected to use them.
 */
function TrayFlyout() {
  return (
    <div className="flex h-svh flex-col overflow-hidden border-3 border-ink bg-sky">
      <TitleBar buttons={2} onClose={() => void appWindow()?.hide()} />

      <div
        className="flex flex-1 flex-col gap-[11px] px-3.5 py-[13px]"
        style={{ background: "linear-gradient(#dff2fb,#b9e4f6)" }}
      >
        <div className="flex items-center gap-3">
          <Sprite action="idle" scale={2} fx={false} />
          <div className="flex flex-col gap-1">
            <span className="font-pixel text-[11px] text-[#12283d]">{MOCK_SURFACE.stateLabel}</span>
            <span className="text-[11px] text-[#3d4f61]">{MOCK_SURFACE.tokenText} of 200k used</span>
          </div>
        </div>

        <Meter
          tokens={MOCK_SURFACE.tokens}
          filled={MOCK_SURFACE.meterFilled}
          color={MOCK_SURFACE.meterColor}
          segmentHeight={11}
          gap={2}
        />

        <div className="flex gap-2">
          <button
            type="button"
            className="flex h-8 flex-1 items-center justify-center border-3 border-[#12283d] bg-[#fffdf8] font-pixel text-[9px] whitespace-nowrap text-[#12283d] transition-transform duration-75 hover:-translate-x-px hover:-translate-y-px active:translate-x-px active:translate-y-px"
            style={{ boxShadow: "3px 3px 0 rgba(18,40,61,0.28)" }}
          >
            open panel
          </button>
          <button
            type="button"
            className="flex h-8 flex-1 items-center justify-center border-3 border-[#12283d] bg-gold font-pixel text-[9px] text-ink-soft transition-transform duration-75 hover:-translate-x-px hover:-translate-y-px hover:bg-gold-hover active:translate-x-px active:translate-y-px"
            style={{ boxShadow: "3px 3px 0 rgba(18,40,61,0.28)" }}
          >
            clear
          </button>
        </div>
      </div>
    </div>
  );
}
