"use client";

import { Button } from "@contextjule/ui/components/button";
import { useState } from "react";

import { licenseMessage, useLicense } from "../lib/license";
import { useUpdater } from "../lib/updates";

/**
 * Licence and updates, on the nudges screen because that is the settings
 * surface and the design has no fifth tab to add.
 *
 * The activation count is the part that earns its space: "2 of 3 machines" is
 * the only way someone can tell why a new laptop refuses the key they already
 * paid for, and releasing this machine is the fix.
 */
export function LicenseCard() {
  const { state, deactivate, revalidate } = useLicense();
  const { status, check, install } = useUpdater();
  const [busy, setBusy] = useState(false);

  const activations =
    state.activationsUsed !== null && state.activationsLimit !== null
      ? `${state.activationsUsed} of ${state.activationsLimit} machines`
      : state.activationsUsed !== null
        ? `${state.activationsUsed} machines`
        : null;

  return (
    <div className="flex flex-col gap-2.5 border-3 border-sky-ink bg-cream-raised px-3.5 py-3 shadow-[4px_4px_0_rgba(18,40,61,0.22)]">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-pixel text-[9px] text-[#14567e]">licence</span>
        <span className="font-pixel text-[8px] text-[#5b6b7c]">
          {state.status === "offline_grace" ? "offline" : state.status}
        </span>
      </div>

      <span className="text-[11px] leading-[1.5] text-[#5b6b7c]">
        {licenseMessage(state.status)}
      </span>

      {state.email ? (
        <span className="text-[11px] text-sky-ink" data-selectable>
          {state.email}
          {activations ? ` · ${activations}` : ""}
        </span>
      ) : activations ? (
        <span className="text-[11px] text-sky-ink">{activations}</span>
      ) : null}

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="flex-1"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            if (status.kind === "available" || status.kind === "ready") await install();
            else await check();
            setBusy(false);
          }}
        >
          {updateLabel(status)}
        </Button>

        <Button
          size="sm"
          variant="destructive"
          disabled={busy || !state.licenseKey}
          onClick={async () => {
            setBusy(true);
            await deactivate();
            setBusy(false);
          }}
        >
          release this machine
        </Button>
      </div>

      {state.status === "offline_grace" ? (
        <button
          type="button"
          onClick={() => void revalidate()}
          className="self-start font-pixel text-[8px] text-[#14567e] underline underline-offset-2"
        >
          check again now
        </button>
      ) : null}
    </div>
  );
}

function updateLabel(status: ReturnType<typeof useUpdater>["status"]): string {
  switch (status.kind) {
    case "checking":
      return "checking…";
    case "none":
      return "up to date";
    case "available":
      return `install ${status.version}`;
    case "downloading":
      return `${status.percent}%`;
    case "ready":
      return "restart to finish";
    case "error":
      return "check failed";
    default:
      return "check for updates";
  }
}
