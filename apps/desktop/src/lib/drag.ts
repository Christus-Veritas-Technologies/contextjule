"use client";

import { useCallback, useRef } from "react";

import * as ipc from "./ipc";
import { appWindow } from "./window";

/**
 * Dragging a frameless window.
 *
 * `startDragging` hands the whole gesture to the operating system, which is the
 * only way to get native snapping, multi-monitor behaviour and no cursor lag.
 * The cost is that we never see the moves — so the walk animation is driven by
 * "a drag is in progress", not by distance travelled, and it ends on the
 * pointer release we do get.
 *
 * On release the window parks itself against the nearest screen edge, which is
 * what stops a mini bar ending up two pixels off the corner.
 */
export function useWindowDrag(
  surface: ipc.Surface,
  options: { onStart?: () => void; onEnd?: () => void; snapThreshold?: number } = {},
) {
  const dragging = useRef(false);

  const end = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    options.onEnd?.();
    void ipc.surfaceSnap(surface, options.snapThreshold ?? 24);
  }, [surface, options]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      // Left button only. A right-click is a context menu everywhere else and
      // should not fling her across the desktop.
      if (event.button !== 0) return;
      dragging.current = true;
      options.onStart?.();

      const window = appWindow();
      if (window) {
        void window.startDragging();
        // The OS owns the gesture from here, so the pointerup may never reach
        // us. A short settle is more reliable than waiting for an event that
        // the compositor has already swallowed.
        setTimeout(end, 260);
      }
    },
    [options, end],
  );

  return { onPointerDown, onPointerUp: end, onPointerCancel: end };
}
