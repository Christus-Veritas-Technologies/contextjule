"use client";

import { patrolAt, type PatrolOptions } from "@contextjule/core";
import { Scene, type SceneProps } from "@contextjule/ui/components/scene";
import { SpeechBox } from "@contextjule/ui/components/speech-box";
import { useEffect, useRef, useState } from "react";

/**
 * Her stage: she says hello once, then patrols.
 *
 * The routine is the site hero's, from `designs/site/README.md` — walk the
 * width of the band, stop, turn and wave, walk back, wave again, loop. Before
 * that she delivers a greeting in the speech box, and only ever once: a pet
 * that repeats its introduction every ninety seconds stops being charming
 * roughly the second time you notice.
 *
 * Which screens have said their line is tracked at module scope rather than in
 * state, so navigating away and back does not restart it. A relaunch does,
 * which is the right granularity for a greeting.
 */
const greeted = new Set<string>();

/** Beat before she starts moving, so the last line is read, not glimpsed. */
const AFTER_GREETING_MS = 900;

export interface JuleStageProps extends Omit<SceneProps, "action" | "character" | "mirrored"> {
  /** Identifies the screen, so its greeting fires once. */
  stageId: string;
  greeting: string[];
  /** Pixels from the left the walk starts and ends at. */
  travel: { from: number; to: number };
  bottom: number;
  patrol?: PatrolOptions;
  /** Where the balloon sits while she is speaking. */
  speechAt?: { left?: number; right?: number; bottom: number };
  /** Overrides everything while set — a reaction, or a load-state pose. */
  overrideAction?: string;
}

export function JuleStage({
  stageId,
  greeting,
  travel,
  bottom,
  patrol,
  speechAt = { left: 16, bottom: 200 },
  overrideAction,
  ...scene
}: JuleStageProps) {
  const [speaking, setSpeaking] = useState(() => !greeted.has(stageId));
  const [now, setNow] = useState(() => Date.now());
  // When the patrol clock starts. Null while she is still talking.
  const startedAt = useRef<number | null>(greeted.has(stageId) ? Date.now() : null);

  // The greeting holds long enough to read — roughly a line a second, with a
  // floor so a two-word hello is not gone before it lands.
  useEffect(() => {
    if (!speaking) return;
    const hold = Math.max(2_600, greeting.length * 1_100) + AFTER_GREETING_MS;
    const timer = setTimeout(() => {
      greeted.add(stageId);
      startedAt.current = Date.now();
      setSpeaking(false);
    }, hold);
    return () => clearTimeout(timer);
  }, [speaking, greeting.length, stageId]);

  // 12fps is the fastest strip she has, so nothing is gained by ticking faster
  // and a desktop pet has no business burning a frame budget.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000 / 12);
    return () => clearInterval(id);
  }, []);

  const elapsed = startedAt.current === null ? 0 : now - startedAt.current;
  const walk = patrolAt(elapsed, patrol);

  // Standing still to greet, then the patrol takes over. An override — a boop,
  // a collapse — wins over both, and she carries on from wherever she was once
  // it finishes, because the position comes from the clock rather than a step
  // counter.
  const action = overrideAction ?? (speaking ? "idle" : walk.action);
  const left = Math.round(travel.from + (travel.to - travel.from) * (speaking ? 0 : walk.position));

  return (
    <Scene
      {...scene}
      action={action}
      mirrored={!speaking && !overrideAction && walk.mirrored}
      character={{ left, bottom }}
    >
      {speaking ? (
        <div
          className="absolute"
          style={{ left: speechAt.left, right: speechAt.right, bottom: speechAt.bottom }}
        >
          <SpeechBox lines={greeting} tone="normal" tail="down-left" width={190} />
        </div>
      ) : null}
      {scene.children}
    </Scene>
  );
}
