import { DEFAULT_NUDGES } from "@contextjule/core";
import { ToggleRow } from "@contextjule/ui/components/rows";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { LicenseCard } from "../../components/license-card";
import { SourcesCard } from "../../components/sources-card";
import { useSettings } from "../../lib/data";
import * as ipc from "../../lib/ipc";

export const Route = createFileRoute("/_app/nudges")({ component: Nudges });

/** The five switches, in the order the design draws them. */
const NUDGES = [
  { id: "warnings", name: "Context warnings", note: "At 60% and 90% of the window" },
  { id: "hydration", name: "Hydration breaks", note: "After two hours in one session" },
  { id: "rituals", name: "Open and close rituals", note: "She waves in, debriefs out" },
  { id: "cursor", name: "Follow the cursor", note: "She looks where you point" },
  { id: "sleep", name: "Overnight sleep", note: "Curls up after 30 idle minutes" },
] as const;

/** The surfaces someone can leave open. `main` is not one — it always opens. */
const SURFACES = [
  { id: "mini-bar" as const, name: "Mini bar", note: "Always on top, snaps to the screen edge" },
  { id: "overlay" as const, name: "On the desktop", note: "Transparent, click-through except on her" },
  { id: "panel" as const, name: "Panel", note: "The compact window, without the tabs" },
];

/**
 * 03 nudges — when she speaks up, and the app's only settings surface.
 *
 * Every switch writes through to somewhere that survives a restart: the nudges
 * and surfaces to the local store, autostart to the operating system's own
 * login items. Nothing here is component state — a preference that forgets
 * itself is worse than no preference.
 */
function Nudges() {
  const { bool, set } = useSettings();
  const [autostart, setAutostart] = useState<boolean | null>(null);
  const [visible, setVisible] = useState<Record<string, boolean>>({});

  // Autostart is read from the OS rather than mirrored into our settings, so a
  // user who removes it from their own login items sees that reflected here.
  const refresh = useCallback(() => {
    void ipc.autostartEnabled().then(setAutostart);
    for (const surface of SURFACES) {
      void ipc
        .surfaceVisible(surface.id)
        .then((open) => setVisible((current) => ({ ...current, [surface.id]: open })));
    }
  }, []);

  useEffect(refresh, [refresh]);

  return (
    <div
      data-band="sky"
      className="cj-screen-in flex h-full flex-col gap-3 overflow-y-auto p-4"
      style={{ background: "linear-gradient(#dff2fb,#b9e4f6)" }}
    >
      <span className="font-pixel text-[10px] text-[#14567e]">when she speaks up</span>

      {NUDGES.map((nudge, index) => (
        <ToggleRow
          key={nudge.id}
          className={`cj-row-in cj-delay-${Math.min(index + 1, 8)}`}
          name={nudge.name}
          note={nudge.note}
          checked={bool(`nudges.${nudge.id}`, DEFAULT_NUDGES[nudge.id])}
          onCheckedChange={(on) => void set(`nudges.${nudge.id}`, String(on))}
        />
      ))}

      <span className="mt-1 font-pixel text-[10px] text-[#14567e]">where she lives</span>

      {SURFACES.map((surface, index) => (
        <ToggleRow
          key={surface.id}
          className={`cj-row-in cj-delay-${Math.min(index + 1, 8)}`}
          name={surface.name}
          note={surface.note}
          checked={visible[surface.id] ?? false}
          onCheckedChange={(on) => {
            setVisible((current) => ({ ...current, [surface.id]: on }));
            void ipc.surfaceSetVisible(surface.id, on);
          }}
        />
      ))}

      <ToggleRow
        name="Start with the machine"
        note="She is waiting when you sit down"
        checked={autostart ?? false}
        onCheckedChange={(on) => {
          setAutostart(on);
          void ipc.autostartSet(on).then(refresh);
        }}
      />

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
