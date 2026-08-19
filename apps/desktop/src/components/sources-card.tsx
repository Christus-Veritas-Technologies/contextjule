"use client";

import { Button } from "@contextjule/ui/components/button";
import { useCallback, useEffect, useState } from "react";

import { useSources } from "../lib/data";
import * as ipc from "../lib/ipc";

/**
 * Where she watches.
 *
 * This list is the honest answer to "it isn't working". Every reader says
 * whether its directory exists, so nobody has to guess why she is idle — and
 * the status line, which is Claude Code's own supported integration, is one
 * click away rather than buried in a settings file.
 */
export function SourcesCard() {
  const { data: sources, reload } = useSources();
  const [statusline, setStatusline] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    void ipc.statuslineInstalled().then(setStatusline);
  }, []);

  useEffect(refresh, [refresh]);

  const anyAvailable = sources.some((source) => source.available);

  return (
    <div className="flex flex-col gap-2.5 border-3 border-sky-ink bg-cream-raised px-3.5 py-3 shadow-[4px_4px_0_rgba(18,40,61,0.22)]">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-pixel text-[9px] text-[#14567e]">where she watches</span>
        <button
          type="button"
          onClick={() => {
            reload();
            refresh();
          }}
          className="cj-press font-pixel text-[8px] text-[#5b6b7c] underline underline-offset-2"
        >
          rescan
        </button>
      </div>

      {sources.map((source) => (
        <div key={source.id} className="flex items-center gap-2.5">
          <span
            className="block size-2 shrink-0"
            style={{ background: source.available ? "#7bbf6a" : "#c2cdd6" }}
          />
          <span className="text-[12px] text-sky-ink">{source.label}</span>
          <span className="ml-auto font-pixel text-[8px] text-[#5b6b7c]">
            {source.available ? "watching" : "not found"}
          </span>
        </div>
      ))}

      {!anyAvailable ? (
        <span className="text-[11px] leading-[1.5] text-[#5b6b7c]">
          Nothing to read yet. She starts watching the moment Claude Code or Codex runs.
        </span>
      ) : null}

      <div className="mt-0.5 flex flex-col gap-1.5 border-t-2 border-[#c2cdd6] pt-2.5">
        <span className="text-[11px] leading-[1.5] text-[#5b6b7c]">
          {statusline
            ? "Claude Code reports straight to her. Exact numbers, and a context bar in your terminal."
            : "Let Claude Code report to her directly — exact numbers, and you get a context bar in your terminal."}
        </span>

        <Button
          size="sm"
          variant={statusline ? "secondary" : "primary"}
          disabled={busy || statusline === null}
          onClick={async () => {
            setBusy(true);
            try {
              if (statusline) await ipc.statuslineUninstall();
              else await ipc.statuslineInstall();
            } finally {
              refresh();
              setBusy(false);
            }
          }}
        >
          {statusline ? "turn off the status line" : "connect Claude Code"}
        </Button>
      </div>
    </div>
  );
}
