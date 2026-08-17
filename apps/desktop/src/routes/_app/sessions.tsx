import { formatTokens } from "@contextjule/core/format";
import { SessionRow } from "@contextjule/ui/components/rows";
import { createFileRoute } from "@tanstack/react-router";

import { useSessions } from "../../lib/data";
import { hasHost } from "../../lib/ipc";
import { MOCK_SESSIONS, MOCK_SESSIONS_SUMMARY } from "../../lib/mock";

export const Route = createFileRoute("/_app/sessions")({ component: Sessions });

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 02 sessions — what she remembers.
 *
 * One row per conversation, a pixel bar for its share of the window, and the
 * last card is her carrying yesterday forward. Rows alternate cream shades
 * rather than using a zebra tint, so the rule between them stays the divider.
 */
function Sessions() {
  const { data: sessions, loading } = useSessions(Date.now() - DAY_MS, 50);

  // With no Tauri host this is a design review, so show the sheet's own rows.
  const rows = hasHost()
    ? sessions.map((session, index) => ({
        key: session.id,
        index,
        name: session.title ?? session.source,
        tokens: session.peakTokens,
        note: noteFor(session.peakTokens, session.cleanses),
        accent: undefined,
        fraction: undefined,
      }))
    : MOCK_SESSIONS.map((session, index) => ({
        key: session.name,
        index,
        name: session.name,
        tokens: session.tokens,
        note: session.note,
        accent: session.accent,
        fraction: session.fraction,
      }));

  const total = rows.reduce((sum, row) => sum + row.tokens, 0);

  return (
    <div className="flex h-full flex-col bg-cream">
      <div className="flex items-baseline justify-between gap-2.5 border-b-2 border-cream-rule px-4 pt-4 pb-3">
        <span className="font-pixel text-[11px] text-[#231b12]">today</span>
        <span className="font-pixel text-[9px] whitespace-nowrap text-[#8a7660]">
          {rows.length === 0
            ? "nothing yet"
            : `${rows.length} session${rows.length === 1 ? "" : "s"} · ${formatTokens(total)}`}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.length === 0 && !loading ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
            <span className="font-pixel text-[10px] text-[#8a7660]">nothing to remember yet</span>
            <span className="text-[11px] leading-[1.5] text-[#6b5b48]">
              She starts keeping notes the moment a session is running.
            </span>
          </div>
        ) : (
          rows.map((row) => (
            <SessionRow
              key={row.key}
              index={row.index}
              name={row.name}
              tokens={row.tokens}
              accent={row.accent}
              fraction={row.fraction}
              note={row.note}
            />
          ))
        )}
      </div>

      {rows.length > 0 ? (
        <div className="mt-auto mx-4 mb-4 flex items-center gap-2.5 border-2 border-[#d9c4a4] bg-[#fffdf8] px-3 py-[11px]">
          <span className="block size-2 shrink-0 bg-gold" />
          <span className="text-[11px] leading-[1.45] text-[#4c3f31]">
            {MOCK_SESSIONS_SUMMARY.carryOver}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function noteFor(tokens: number, cleanses: number): string {
  const suffix =
    cleanses === 0 ? "" : ` ${cleanses} cleanse${cleanses === 1 ? "" : "s"}.`;
  if (tokens >= 128_000) return `Crashed.${suffix}`;
  if (tokens >= 32_000) return `Heavy.${suffix}`;
  if (tokens >= 5_000) return `Loaded.${suffix}`;
  return `Fresh.${suffix}`;
}
