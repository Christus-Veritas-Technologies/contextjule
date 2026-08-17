import { StatTile, UnlockRow } from "@contextjule/ui/components/rows";
import { Sprite } from "@contextjule/ui/components/sprite";
import { createFileRoute } from "@tanstack/react-router";

import { MOCK_GROWTH } from "../../lib/mock";

export const Route = createFileRoute("/_app/growth")({ component: Growth });

/**
 * 04 growth — the dusk band, and the only screen that looks backwards instead
 * of at right now. Locked unlocks are dimmed rather than hidden, so there is
 * always something visible to play toward.
 */
function Growth() {
  return (
    <div
      data-band="dusk"
      className="flex h-full flex-col gap-3.5 overflow-y-auto p-4"
      style={{ background: "linear-gradient(#3a2f56,#241d38)" }}
    >
      <div
        className="flex items-center gap-3.5 border-3 border-ink p-3.5"
        style={{ background: "linear-gradient(#5b4a7f,#463869)" }}
      >
        <Sprite state="fresh" scale={3} frameIndex={1} />
        <div className="flex flex-col gap-1.5">
          <span className="font-pixel text-[13px] text-[#fdf6ea]">{MOCK_GROWTH.headline}</span>
          <span className="text-[12px] leading-[1.5] text-[#c3b8dc]">{MOCK_GROWTH.subhead}</span>
        </div>
      </div>

      <div className="flex gap-2.5">
        {MOCK_GROWTH.stats.map((stat) => (
          <StatTile key={stat.label} value={stat.value} label={stat.label} />
        ))}
      </div>

      <span className="mt-0.5 font-pixel text-[10px] text-[#ffc861]">unlocks</span>

      {MOCK_GROWTH.unlocks.map((unlock) => (
        <UnlockRow
          key={unlock.name}
          name={unlock.name}
          requirement={unlock.requirement}
          unlocked={unlock.unlocked}
        />
      ))}
    </div>
  );
}
