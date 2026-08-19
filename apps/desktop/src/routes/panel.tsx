import { LOAD_STATE_SPECS } from "@contextjule/core/context";
import { formatTokens } from "@contextjule/core/format";
import { Meter } from "@contextjule/ui/components/meter";
import { Scene } from "@contextjule/ui/components/scene";
import { TitleBar } from "@contextjule/ui/components/window-frame";
import { useCountUp } from "@contextjule/ui/hooks/use-count-up";
import { createFileRoute } from "@tanstack/react-router";

import * as ipc from "../lib/ipc";
import { useJule } from "../lib/jule";
import { MOCK_SURFACE } from "../lib/mock";
import { appWindow } from "../lib/window";

export const Route = createFileRoute("/panel")({ component: Panel });

/**
 * Surface A — the panel, 320x450.
 *
 * The same scene as the app's home screen but compact: she stands on the grass
 * at 6x with the gauge and buttons on the cream tray below. Resizable to 380
 * wide; the sprite stays 6x and the gauge stretches, which is why the meter
 * segments here are flex rather than fixed-width.
 */
function Panel() {
  const jule = useJule();
  const sample = !jule.live && !ipc.hasHost();

  const live = jule.live;
  const tokens = sample ? MOCK_SURFACE.tokens : jule.tokens;
  const windowSize = jule.windowSize;
  const load = LOAD_STATE_SPECS[jule.load];
  const shown = useCountUp(tokens, { enabled: !sample });

  return (
    <div className="flex h-svh flex-col overflow-hidden border-3 border-ink bg-cream">
      <TitleBar
        buttons={2}
        onMaximize={() => void appWindow()?.toggleMaximize()}
        onClose={() => void ipc.surfaceHide("panel")}
      />

      <Scene
        className="flex-1"
        scale={6}
        action={jule.action}
        skyStops={[54, 78]}
        grassHeight={78}
        grassShadeHeight={24}
        showCloud={false}
        showTufts={false}
        character={{ left: "center", bottom: 16 }}
      />

      <div className="flex flex-col gap-[9px] border-t-3 border-ink bg-cream px-4 py-3.5">
        <div className="flex items-baseline justify-between">
          <span className="font-pixel text-[10px]" style={{ color: load.labelColor }}>
            {load.label}
          </span>
          <span className="font-pixel text-[12px] text-[#231b12]">
            {live ? formatTokens(shown) : MOCK_SURFACE.tokenText}
          </span>
        </div>

        <Meter
          tokens={shown}
          windowSize={windowSize}
          filled={sample ? MOCK_SURFACE.meterFilled : undefined}
          segmentHeight={16}
          gap={3}
        />

        <div className="flex justify-between">
          <span className="font-pixel text-[8px] text-[#8a7660]">0</span>
          <span className="font-pixel text-[8px] text-[#8a7660]">
            {Math.round(windowSize / 1000)}k
          </span>
        </div>

        <div className="mt-[5px] flex gap-2">
          <button
            type="button"
            onClick={() => void jule.cleanse()}
            title={`Copies ${jule.clearCommand} to your clipboard`}
            className="cj-press flex h-[38px] flex-1 items-center justify-center border-3 border-ink-soft bg-gold font-pixel text-[10px] whitespace-nowrap text-ink-soft shadow-hard hover:bg-gold-hover"
          >
            {/* Not "clear context": this window cannot clear anyone's context,
                and the design sheet's label was written before that was settled.
                It hands over the command; the label now says so. */}
            {jule.handedOver ? "copied. paste it." : `copy ${jule.clearCommand}`}
          </button>
          <button
            type="button"
            aria-label="Open the full window"
            onClick={() => void ipc.surfaceShow("main")}
            className="cj-press flex size-[38px] items-center justify-center border-3 border-ink-soft bg-[#fffdf8] font-pixel text-[11px] text-ink-soft shadow-hard-soft hover:bg-[#f6ead6]"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
