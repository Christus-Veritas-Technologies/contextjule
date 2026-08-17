import { SpeechBox } from "@contextjule/ui/components/speech-box";
import { Sprite } from "@contextjule/ui/components/sprite";
import { juleEngine } from "@contextjule/ui/jule";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/overlay")({ component: Overlay });

/**
 * Surface D — the desktop overlay, 120x160.
 *
 * A transparent, click-through window pinned above the dock. No plate, no
 * chrome, 4x sprite with a contact shadow under her feet — without that smear
 * she reads as floating over the desktop rather than standing on it.
 *
 * Click-through is set on the Tauri window and released only while the cursor
 * is over her body, which is what lets a click land on whatever is behind her
 * everywhere else.
 */
function Overlay() {
  const [speaking, setSpeaking] = useState(false);

  // Marks the window's own background as transparent. The app's base stylesheet
  // keys off this rather than the route, so nothing has to know about routing.
  useEffect(() => {
    document.body.dataset.surface = "overlay";
    return () => {
      delete document.body.dataset.surface;
    };
  }, []);

  /** A flat smear, 22x3 at 1x. Never a blur — this is a shape, not a gradient. */
  const contactShadow = useMemo(() => {
    const j = juleEngine();
    const g = j.mk(22, 3);
    j.r(g, 2, 0, 19, 0, "J");
    j.r(g, 0, 1, 21, 1, "J");
    j.r(g, 2, 2, 19, 2, "J");
    return g;
  }, []);

  return (
    <div className="relative h-svh w-svw select-none">
      {speaking ? (
        <SpeechBox
          lines={["context is at 121k.", "want me to summarise", "and start fresh?"]}
          tone="warning"
          tail="down-left"
          fontSize={11}
          className="absolute bottom-full left-2 mb-2"
        />
      ) : null}

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
        <Sprite
          action="idle"
          scale={4}
          className="cursor-pointer"
          data-tauri-drag-region
          onClick={() => setSpeaking((current) => !current)}
        />
        <Sprite
          grid={contactShadow}
          scale={4}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 opacity-30"
        />
      </div>
    </div>
  );
}
