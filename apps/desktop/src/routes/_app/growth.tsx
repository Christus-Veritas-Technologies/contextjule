import { formatHours, formatTokens } from "@contextjule/core/format";
import { StatTile, UnlockRow } from "@contextjule/ui/components/rows";
import { Sprite } from "@contextjule/ui/components/sprite";
import { createFileRoute } from "@tanstack/react-router";

import { useStats, useUnlocks } from "../../lib/data";
import { hasHost } from "../../lib/ipc";
import { MOCK_GROWTH } from "../../lib/mock";

export const Route = createFileRoute("/_app/growth")({ component: Growth });

/** Every cosmetic, and what it costs. Earned ones are stored; the rest are goals. */
const UNLOCKS = [
  { id: "hat-wizard", name: "Wizard hat", requirement: "50 hours", hours: 50 },
  { id: "campfire", name: "Campfire idle", requirement: "150 hours", hours: 150 },
  { id: "outfit-2", name: "Second outfit", requirement: "2M tokens", tokens: 2_000_000 },
];

/**
 * 04 growth — the dusk band, and the only screen that looks backwards instead
 * of at right now. Locked unlocks are dimmed rather than hidden, so there is
 * always something visible to play toward.
 */
function Growth() {
  const { data: stats } = useStats();
  const { data: earned } = useUnlocks();

  const live = hasHost() && stats.sessions > 0;
  const hours = Math.floor(stats.timeTogetherMs / 3_600_000);

  const headline = live ? `${formatHours(stats.timeTogetherMs)} together` : MOCK_GROWTH.headline;
  const subhead = live
    ? `${formatTokens(stats.tokensCarried)} tokens carried across ${stats.sessions} session${stats.sessions === 1 ? "" : "s"}.`
    : MOCK_GROWTH.subhead;

  const tiles = live
    ? [
        { value: formatTokens(stats.tokensCarried), label: "tokens carried" },
        { value: String(stats.cleanses), label: "cleanses" },
        { value: String(stats.collapses), label: "collapses" },
      ]
    : MOCK_GROWTH.stats;

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
          <span className="font-pixel text-[13px] text-[#fdf6ea]">{headline}</span>
          <span className="text-[12px] leading-[1.5] text-[#c3b8dc]">{subhead}</span>
        </div>
      </div>

      <div className="flex gap-2.5">
        {tiles.map((tile) => (
          <StatTile key={tile.label} value={tile.value} label={tile.label} />
        ))}
      </div>

      <span className="mt-0.5 font-pixel text-[10px] text-[#ffc861]">unlocks</span>

      {UNLOCKS.map((unlock) => {
        const unlocked =
          earned.includes(unlock.id) ||
          (live &&
            ((unlock.hours !== undefined && hours >= unlock.hours) ||
              (unlock.tokens !== undefined && stats.tokensCarried >= unlock.tokens)));
        return (
          <UnlockRow
            key={unlock.id}
            name={unlock.name}
            requirement={unlocked ? "unlocked" : unlock.requirement}
            unlocked={unlocked}
          />
        );
      })}
    </div>
  );
}
