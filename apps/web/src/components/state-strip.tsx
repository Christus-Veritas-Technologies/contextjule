"use client";

import { LOAD_STATES, LOAD_STATE_SPECS } from "@contextjule/core/context";
import { Sprite } from "@contextjule/ui/components/sprite";

/** The four load states side by side — the section that explains the product. */
export function StateStrip() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {LOAD_STATES.map((id) => {
        const spec = LOAD_STATE_SPECS[id];
        return (
          <div
            key={id}
            className="flex flex-col items-center gap-4 border-3 border-ink bg-[#241f2f] p-6 shadow-hard-lg"
          >
            <Sprite state={id} scale={3} />
            <span className="font-pixel text-[11px]" style={{ color: spec.accent }}>
              {spec.label}
            </span>
            <span className="font-pixel text-[9px] text-[#968fa3]">
              {spec.to === Number.POSITIVE_INFINITY
                ? `${spec.from / 1000}k +`
                : `${spec.from / 1000}k – ${spec.to / 1000}k`}
            </span>
            <p className="text-center text-[12px] leading-[1.6] text-[#a8a2b4]">{spec.note}</p>
          </div>
        );
      })}
    </div>
  );
}
