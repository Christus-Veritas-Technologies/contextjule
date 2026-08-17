import { ToggleRow } from "@contextjule/ui/components/rows";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { MOCK_NUDGES } from "../../lib/mock";

export const Route = createFileRoute("/_app/nudges")({ component: Nudges });

/**
 * 03 nudges — when she speaks up.
 *
 * Sky band, five switches, square knobs. The privacy line is pinned to the
 * bottom because it is the thing people check first, and it is the one line in
 * the app that has to be literally true.
 */
function Nudges() {
  const [nudges, setNudges] = useState(MOCK_NUDGES);

  return (
    <div
      data-band="sky"
      className="flex h-full flex-col gap-3 p-4"
      style={{ background: "linear-gradient(#dff2fb,#b9e4f6)" }}
    >
      <span className="font-pixel text-[10px] text-[#14567e]">when she speaks up</span>

      {nudges.map((nudge) => (
        <ToggleRow
          key={nudge.id}
          name={nudge.name}
          note={nudge.note}
          checked={nudge.on}
          onCheckedChange={(on) =>
            setNudges((current) => current.map((n) => (n.id === nudge.id ? { ...n, on } : n)))
          }
        />
      ))}

      <div className="mt-auto flex items-center gap-2.5 bg-[#12283d] px-[13px] py-[11px]">
        <span className="block size-2 shrink-0 bg-fresh" />
        <span className="font-pixel text-[9px] leading-[1.6] text-[#dff2fb]">
          all local · nothing leaves this mac
        </span>
      </div>
    </div>
  );
}
