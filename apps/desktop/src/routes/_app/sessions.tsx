import { SessionRow } from "@contextjule/ui/components/rows";
import { createFileRoute } from "@tanstack/react-router";

import { MOCK_SESSIONS, MOCK_SESSIONS_SUMMARY } from "../../lib/mock";

export const Route = createFileRoute("/_app/sessions")({ component: Sessions });

/**
 * 02 sessions — what she remembers.
 *
 * One row per conversation, a pixel bar for its share of the window, and the
 * last card is her carrying yesterday forward. Rows alternate cream shades
 * rather than using a zebra tint, so the rule between them stays the divider.
 */
function Sessions() {
  return (
    <div className="flex h-full flex-col bg-cream">
      <div className="flex items-baseline justify-between gap-2.5 border-b-2 border-cream-rule px-4 pt-4 pb-3">
        <span className="font-pixel text-[11px] text-[#231b12]">{MOCK_SESSIONS_SUMMARY.heading}</span>
        <span className="font-pixel text-[9px] whitespace-nowrap text-[#8a7660]">
          {MOCK_SESSIONS_SUMMARY.count}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {MOCK_SESSIONS.map((session, index) => (
          <SessionRow
            key={session.name}
            index={index}
            name={session.name}
            tokens={session.tokens}
            accent={session.accent}
            fraction={session.fraction}
            note={session.note}
          />
        ))}
      </div>

      <div className="mt-auto mx-4 mb-4 flex items-center gap-2.5 border-2 border-[#d9c4a4] bg-[#fffdf8] px-3 py-[11px]">
        <span className="block size-2 shrink-0 bg-gold" />
        <span className="text-[11px] leading-[1.45] text-[#4c3f31]">
          {MOCK_SESSIONS_SUMMARY.carryOver}
        </span>
      </div>
    </div>
  );
}
