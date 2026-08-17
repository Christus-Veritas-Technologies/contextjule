import { formatDuration, formatTokensExact } from "@contextjule/core/format";
import { Meter } from "@contextjule/ui/components/meter";
import { Scene } from "@contextjule/ui/components/scene";
import { createFileRoute } from "@tanstack/react-router";

import { MOCK_SESSION } from "../../lib/mock";

export const Route = createFileRoute("/_app/")({ component: Home });

/**
 * 01 home — the only screen with the outdoor scene.
 *
 * She stands on the grass, the meter card floats over the sky, and the cleanse
 * button is the one gold thing on the page. Every number in the layout comes
 * from `designs/screens/app-screens.html`; her position and the cloud's are
 * measured from each frame's origin pixel, which is why `Scene` positions with
 * `anchor="origin"`.
 */
function Home() {
  const { tokens, windowSize, model, elapsedMs, meterFilled, note, notePip } = MOCK_SESSION;

  return (
    <div className="flex h-full flex-col">
      <Scene
        className="h-[352px] shrink-0"
        scale={4}
        action="idle"
        skyStops={[52, 74]}
        grassHeight={96}
        grassShadeHeight={30}
        cloud={{ right: 34, top: 30, scale: 4 }}
        tufts={{ left: 0, bottom: 74, scale: 4 }}
        character={{ left: 248, bottom: 188 }}
      >
        <div
          className="absolute top-[18px] left-[18px] flex w-[212px] flex-col gap-3 border-3 border-[#12283d] bg-[#fffdf8] p-4"
          style={{ boxShadow: "5px 5px 0 rgba(18,40,61,0.32)" }}
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-pixel text-[9px] text-[#5b6b7c]">carrying</span>
            <span className="font-pixel text-[9px] text-[#a8621c]">loaded</span>
          </div>

          <span className="font-pixel text-[22px] text-[#12283d]">{formatTokensExact(tokens)}</span>

          <Meter
            tokens={tokens}
            windowSize={windowSize}
            filled={meterFilled}
            color="#f0b13f"
            segmentWidth={11}
            segmentHeight={16}
            gap={3}
          />

          <span className="text-[11px] leading-[1.5] text-[#5b6b7c]">
            of 200k · {model}, {formatDuration(elapsedMs)} in
          </span>
        </div>
      </Scene>

      <div className="flex flex-1 flex-col gap-3 border-t-3 border-ink bg-cream p-4">
        <div className="flex items-center gap-2.5 border-2 border-[#d9c4a4] bg-[#fffdf8] px-3 py-2.5">
          <span className="block size-2 shrink-0" style={{ background: notePip }} />
          <span className="text-[12px] leading-[1.45] text-[#4c3f31]">{note}</span>
        </div>

        <div className="flex gap-2.5">
          <button
            type="button"
            className="flex flex-1 items-center justify-center border-3 border-ink-soft bg-gold px-2.5 py-[13px] shadow-hard transition-transform duration-75 hover:-translate-x-px hover:-translate-y-px hover:bg-gold-hover hover:shadow-hard-md active:translate-x-px active:translate-y-px active:shadow-hard-xs"
          >
            <span className="font-pixel text-[11px] whitespace-nowrap text-ink-soft">
              help her carry this
            </span>
          </button>
          <button
            type="button"
            className="flex items-center justify-center border-3 border-ink-soft bg-[#fffdf8] px-4 py-[13px] shadow-hard-soft transition-transform duration-75 hover:-translate-x-px hover:-translate-y-px hover:bg-[#f6ead6] active:translate-x-px active:translate-y-px"
          >
            <span className="font-pixel text-[11px] text-ink-soft">boop</span>
          </button>
        </div>
      </div>
    </div>
  );
}
