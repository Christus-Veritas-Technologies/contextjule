import { DEFAULT_NUDGES } from "@contextjule/core";
import { ToggleRow } from "@contextjule/ui/components/rows";
import { createFileRoute } from "@tanstack/react-router";

import { LicenseCard } from "../../components/license-card";
import { SourcesCard } from "../../components/sources-card";
import { useSettings } from "../../lib/data";

export const Route = createFileRoute("/_app/nudges")({ component: Nudges });

/** The five switches, in the order the design draws them. */
const NUDGES = [
  { id: "warnings", name: "Context warnings", note: "At 60% and 90% of the window" },
  { id: "hydration", name: "Hydration breaks", note: "After two hours in one session" },
  { id: "rituals", name: "Open and close rituals", note: "She waves in, debriefs out" },
  { id: "cursor", name: "Follow the cursor", note: "She looks where you point" },
  { id: "sleep", name: "Overnight sleep", note: "Curls up after 30 idle minutes" },
] as const;

/**
 * 03 nudges — when she speaks up, and the app's only settings surface.
 *
 * Each switch writes straight to the local store, so it survives a restart, and
 * the behaviour engine reads the same keys — flipping one changes what she does
 * on the next tick, in every window at once.
 *
 * The privacy line is pinned to the bottom because it is the thing people check
 * first, and it is the one line in the app that has to be literally true.
 */
function Nudges() {
  const { bool, set } = useSettings();

  return (
    <div
      data-band="sky"
      className="flex h-full flex-col gap-3 overflow-y-auto p-4"
      style={{ background: "linear-gradient(#dff2fb,#b9e4f6)" }}
    >
      <span className="font-pixel text-[10px] text-[#14567e]">when she speaks up</span>

      {NUDGES.map((nudge) => (
        <ToggleRow
          key={nudge.id}
          name={nudge.name}
          note={nudge.note}
          checked={bool(`nudges.${nudge.id}`, DEFAULT_NUDGES[nudge.id])}
          onCheckedChange={(on) => void set(`nudges.${nudge.id}`, String(on))}
        />
      ))}

      <SourcesCard />

      <LicenseCard />

      <div className="mt-auto flex shrink-0 items-center gap-2.5 bg-[#12283d] px-[13px] py-[11px]">
        <span className="block size-2 shrink-0 bg-fresh" />
        <span className="font-pixel text-[9px] leading-[1.6] text-[#dff2fb]">
          all local · nothing leaves this machine
        </span>
      </div>
    </div>
  );
}
