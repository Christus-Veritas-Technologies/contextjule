import { nudgesFromSettings } from "@contextjule/core";
import { SpeechBox } from "@contextjule/ui/components/speech-box";
import { Sprite } from "@contextjule/ui/components/sprite";
import { juleEngine, type LookDirection } from "@contextjule/ui/jule";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { useSettings } from "../lib/data";
import { useWindowDrag } from "../lib/drag";
import * as ipc from "../lib/ipc";
import { useJule } from "../lib/jule";

export const Route = createFileRoute("/overlay")({ component: Overlay });

const FOLLOW_TICK_MS = 120;

/**
 * Surface D — the desktop overlay, 120x160.
 *
 * A transparent window pinned above the dock. No plate, no chrome, 4x sprite
 * with a contact shadow — without that smear she reads as floating over the
 * desktop rather than standing on it.
 *
 * The window covers a rectangle far larger than she is, so it starts
 * click-through and only becomes clickable while the cursor is over her body.
 * That is what lets a click land on whatever is behind her everywhere else, and
 * it is why the pointer handlers here are load-bearing rather than decoration.
 */
function Overlay() {
  const jule = useJule();
  const { settings } = useSettings();
  const nudges = useMemo(() => nudgesFromSettings(settings), [settings]);
  const [look, setLook] = useState<LookDirection | null>(null);

  const drag = useWindowDrag("overlay", {
    onStart: () => jule.react("held"),
    onEnd: () => jule.endReaction("held"),
  });

  useEffect(() => {
    document.body.dataset.surface = "overlay";
    return () => {
      delete document.body.dataset.surface;
    };
  }, []);

  /** Off by default, and only while she is standing still — turning her head
   *  mid-animation would fight whatever pose she is holding. */
  useEffect(() => {
    if (!nudges.cursor || !ipc.hasHost() || jule.activity !== "idle" || jule.reacting) {
      setLook(null);
      return;
    }
    let cancelled = false;
    const id = setInterval(async () => {
      try {
        const [cursor, frame] = await Promise.all([
          ipc.cursorPosition(),
          ipc.surfacePosition("overlay"),
        ]);
        if (!cancelled) setLook(directionFrom(cursor, frame));
      } catch {
        // The cursor is not worth an error state.
      }
    }, FOLLOW_TICK_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [nudges.cursor, jule.activity, jule.reacting]);

  const lookGrid = useMemo(() => (look ? juleEngine().look(look) : null), [look]);

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
      {jule.speaking ? (
        <SpeechBox
          lines={jule.speaking.lines}
          tone={jule.speaking.tone}
          tail="down-left"
          fontSize={11}
          className="absolute bottom-full left-2 mb-2"
        />
      ) : null}

      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2"
        onPointerEnter={() => void ipc.surfaceClickThrough("overlay", false)}
        onPointerLeave={() => void ipc.surfaceClickThrough("overlay", true)}
      >
        <Sprite
          grid={lookGrid ?? undefined}
          action={jule.action}
          scale={4}
          className="cursor-grab active:cursor-grabbing"
          onClick={jule.boop}
          {...drag}
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

/** Which of the eight directional stills points closest to the cursor. */
function directionFrom(
  cursor: [number, number],
  frame: [number, number, number, number],
): LookDirection {
  const [cx, cy] = cursor;
  const [x, y, width, height] = frame;
  const dx = cx - (x + width / 2);
  const dy = cy - (y + height / 2);

  // A dead zone stops her twitching between neighbours when the cursor is
  // basically level with her.
  const deadZone = 24;
  const horizontal = Math.abs(dx) < deadZone ? "" : dx < 0 ? "left" : "right";
  const vertical = Math.abs(dy) < deadZone ? "" : dy < 0 ? "up" : "down";

  if (vertical && horizontal) return `${vertical}-${horizontal}` as LookDirection;
  if (vertical) return vertical as LookDirection;
  if (horizontal) return horizontal as LookDirection;
  return "down";
}
