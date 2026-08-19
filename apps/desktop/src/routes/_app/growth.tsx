import { formatHours, formatTokens } from "@contextjule/core/format";
import { StatTile } from "@contextjule/ui/components/rows";
import { createFileRoute } from "@tanstack/react-router";

import { Wardrobe } from "../../components/wardrobe";
import { useStats } from "../../lib/data";
import { hasHost } from "../../lib/ipc";
import { MOCK_GROWTH } from "../../lib/mock";

export const Route = createFileRoute("/_app/growth")({ component: Growth });

/**
 * 04 growth — the dusk band, and the only screen that looks backwards instead
 * of at right now.
 *
 * The design listed unlocks as dead rows; they are the only reward loop in the
 * product, so they are worth being able to wear. That is what the wardrobe is.
 */
function Growth() {
  const { data: stats } = useStats();

  const live = hasHost() && stats.sessions > 0;
  const headline = live ? `${formatHours(stats.timeTogetherMs)} together` : MOCK_GROWTH.headline;
  const subhead = live
    ? `${formatTokens(stats.tokensCarried)} carried across ${stats.sessions} session${stats.sessions === 1 ? "" : "s"}.`
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
      className="cj-screen-in flex h-full flex-col gap-3.5 overflow-y-auto p-4"
      style={{ background: "linear-gradient(#3a2f56,#241d38)" }}
    >
      <div
        className="cj-row-in flex flex-col gap-1.5 border-3 border-ink p-3.5"
        style={{ background: "linear-gradient(#5b4a7f,#463869)" }}
      >
        <span className="font-pixel text-[13px] text-[#fdf6ea]">{headline}</span>
        <span className="text-[12px] leading-[1.5] text-[#c3b8dc]">{subhead}</span>
      </div>

      <div className="flex gap-2.5">
        {tiles.map((tile, index) => (
          <StatTile
            key={tile.label}
            className={`cj-row-in cj-delay-${index + 2}`}
            value={tile.value}
            label={tile.label}
          />
        ))}
      </div>

      <Wardrobe />
    </div>
  );
}
