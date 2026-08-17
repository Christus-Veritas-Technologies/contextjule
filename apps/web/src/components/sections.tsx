"use client";

import { Sprite } from "@contextjule/ui/components/sprite";
import { STATES } from "@contextjule/ui/jule";
import { juleEngine } from "@contextjule/ui/jule/render";
import { useMemo } from "react";

/**
 * The three bands under the hero.
 *
 * The layout is lifted from `designs/site/landing.html` — card widths, the 96px
 * header row, the shadow offsets. The words are not. The design's copy sold the
 * mechanism ("the desktop agent reads session length"); this sells what you
 * actually get, and it talks about Jule as a her rather than as an it. Nobody
 * ever wanted a process that monitors token counts. They wanted to stop losing
 * good sessions.
 *
 * Every sprite is generated here rather than loaded as a PNG — same engine,
 * same palette, no image requests, and no chance of a frame going stale against
 * the app.
 */

/* --------------------------------------------------------------------------
   who she is — warm parchment, white cards, hard tan shadows
-------------------------------------------------------------------------- */

const PILLARS = [
  {
    step: "01",
    title: "She keeps watch",
    body: "You never have to check a number again. She is already watching, and she will speak up long before it becomes your problem.",
    frame: () => juleEngine().action("type", 3, { fx: false }),
  },
  {
    step: "02",
    title: "She carries it",
    body: "Every thousand words you two exchange goes into her little pack. When she starts to stoop, you know exactly where you stand — without reading a thing.",
    frame: () => juleEngine().state("heavy", 1),
  },
  {
    step: "03",
    title: "She gets you out",
    body: "Right before the wall, she asks whether you would like a clean start. One click, the pack hits the floor, and the two of you carry on.",
    frame: () => juleEngine().action("dump", 10, { fx: false }),
  },
] as const;

export function WhatItIs() {
  const grids = useMemo(() => PILLARS.map((pillar) => pillar.frame()), []);

  return (
    <section
      id="how"
      className="scroll-mt-[68px] bg-[linear-gradient(#f6ead6,#fdf6ea)] px-5 py-16 md:px-10 md:py-24"
    >
      <div className="mx-auto flex max-w-[1180px] flex-col gap-10 md:gap-13">
        <div className="flex max-w-[660px] flex-col gap-3.5">
          <span className="font-pixel text-[11px] text-[#a8621c]">who she is</span>
          <h2 className="font-pixel text-[21px] leading-[1.3] text-[#231b12] md:text-[30px]">
            A friend who watches the one thing you cannot.
          </h2>
          <p className="text-[15px] leading-[1.65] text-pretty text-[#4c3f31] md:text-[16px]">
            Nobody can feel a chat filling up. You just keep going, and one day it stops making
            sense and you lose an afternoon. Jule feels it for you — she takes the weight of the
            conversation onto her own back, so the first sign of trouble is her stooping, not your
            work falling apart.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3 md:gap-[22px]">
          {PILLARS.map((pillar, index) => (
            <div
              key={pillar.step}
              className="flex flex-col gap-3.5 border-3 border-[#231b12] bg-[#fffdf8] px-6 pt-6 pb-7 shadow-[6px_6px_0_#d9c4a4]"
            >
              <div className="flex h-[96px] items-end justify-between gap-3.5">
                {grids[index] ? <Sprite grid={grids[index]} scale={2} /> : null}
                <span className="font-pixel text-[22px] text-[#e0cbaa]">{pillar.step}</span>
              </div>
              <span className="font-pixel text-[14px] text-[#231b12]">{pillar.title}</span>
              <p className="text-[14px] leading-[1.6] text-pretty text-[#5b4c3c]">{pillar.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------------------
   how she looks — dusk purple, her four moods side by side
-------------------------------------------------------------------------- */

/**
 * Warmer words for each mood than the design archive's.
 *
 * The archive describes poses, because it is a reference for whoever draws the
 * next frame. A visitor wants to know what it means for them, so these say that
 * instead. Falls back to the engine's own note if a state is ever added without
 * one here, so a missing key can never render blank.
 */
const MOOD_NOTES: Record<string, string> = {
  fresh: "Standing tall with room to spare. Say anything, go anywhere.",
  loaded: "Settled in, focused, enjoying herself. This is the good part.",
  heavy: "Knees bent, brow down. Still with you — but she is starting to feel it.",
  crashed: "Face down under the pile. Time for a fresh start, and she will offer first.",
};

export function WhatYouSee() {
  // `chest` is the growth screen's trophy, not one of her moods.
  const states = useMemo(() => STATES.filter((state) => state.id !== "chest"), []);

  return (
    <section
      id="states"
      className="scroll-mt-[68px] bg-[linear-gradient(#3a2f56,#241d38)] px-5 py-16 md:px-10 md:py-24"
    >
      <div className="mx-auto flex max-w-[1180px] flex-col gap-10 md:gap-12">
        <div className="flex max-w-[660px] flex-col gap-3.5">
          <span className="font-pixel text-[11px] text-gold-bright">how she looks</span>
          <h2 className="font-pixel text-[21px] leading-[1.3] text-cream md:text-[30px]">
            You will know at a glance.
          </h2>
          <p className="text-[15px] leading-[1.65] text-pretty text-[#c3b8dc] md:text-[16px]">
            Her pack, her posture and her little face all move together. One look and you know how
            much room the two of you have left. No numbers, no maths, no wondering.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
          {states.map((state) => (
            <div
              key={state.id}
              className="flex flex-col border-3 border-ink shadow-[6px_6px_0_rgba(23,18,31,0.5)]"
            >
              <div className="flex h-[206px] items-end justify-center bg-[linear-gradient(#5b4a7f,#463869)] pt-[22px] pb-3.5">
                <Sprite state={state.id} scale={4} />
              </div>
              <div className="h-[6px]" style={{ background: state.accent }} />
              <div className="flex flex-col gap-2 bg-[#2b2242] px-5 pt-[18px] pb-[22px]">
                <div className="flex items-baseline justify-between gap-2.5">
                  <span className="font-pixel text-[12px] text-cream">{state.label}</span>
                  <span className="font-pixel text-[9px] whitespace-nowrap text-[#bdb0d8]">
                    {state.tokens}
                  </span>
                </div>
                <p className="text-[13px] leading-[1.6] text-pretty text-[#c3b8dc]">
                  {MOOD_NOTES[state.id] ?? state.note}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------------------
   what she does for you — sky blue, her little rituals as cream rows
-------------------------------------------------------------------------- */

const RITUALS = [
  {
    when: "you start something new",
    what: 'She comes running in from the edge of the screen and waves. "New chat. What are we building today?"',
    frame: () => juleEngine().action("wave", 5, { fx: false }),
  },
  {
    when: "you are deep in it",
    what: "She leans in and listens, one ear turned your way, and stays quiet until the answer starts coming.",
    frame: () => juleEngine().action("listen", 2, { fx: false }),
  },
  {
    when: "it has been a long one",
    what: "Tea appears. Her way of mentioning that you two have been at this a while, without making a thing of it.",
    frame: () => juleEngine().action("sip", 6, { fx: false }),
  },
  {
    when: "you call it a night",
    what: "She yawns, wanders off to bed and curls up. Still there in the morning, waiting for you.",
    frame: () => juleEngine().action("bed", 2, { fx: false }),
  },
] as const;

export function WhatItGivesYou() {
  const grids = useMemo(() => RITUALS.map((ritual) => ritual.frame()), []);

  return (
    <section className="bg-[linear-gradient(#8fd4f0,#cdecf8)] px-5 py-16 md:px-10 md:py-24">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-9 md:gap-11">
        <div className="flex max-w-[660px] flex-col gap-3.5">
          <span className="font-pixel text-[11px] text-[#14567e]">what she does for you</span>
          <h2 className="font-pixel text-[21px] leading-[1.3] text-sky-ink md:text-[30px]">
            She is already there before you ask.
          </h2>
        </div>

        <div className="flex max-w-[1010px] flex-col gap-3.5">
          {RITUALS.map((ritual, index) => (
            <div
              key={ritual.when}
              className={[
                "grid items-center gap-4 border-3 border-sky-ink bg-[#fffdf8] px-5 py-4",
                "shadow-[5px_5px_0_rgba(18,40,61,0.28)]",
                "grid-cols-[84px_1fr] md:grid-cols-[124px_216px_1fr] md:gap-[26px] md:px-[26px]",
              ].join(" ")}
            >
              <div className="flex h-[76px] items-end justify-center border-2 border-[#b6dcee] bg-sky md:h-[100px]">
                {grids[index] ? <Sprite grid={grids[index]} scale={2} /> : null}
              </div>
              <span className="font-pixel text-[11px] leading-[1.7] text-sky-ink md:text-[12px]">
                {ritual.when}
              </span>
              {/* On a phone the row is two columns, so the sentence drops to a
                  full-width third line rather than being squeezed to nothing. */}
              <p className="col-span-2 text-[14px] leading-[1.6] text-pretty text-[#3d4f61] md:col-span-1">
                {ritual.what}
              </p>
            </div>
          ))}
        </div>

        <p className="max-w-[640px] text-[13px] leading-[1.6] font-medium text-[#26495f]">
          All of it happens on your own computer. She never types into your chat, never reads over
          your shoulder to anyone else, and not one word of what you two talk about ever leaves the
          machine.
        </p>
      </div>
    </section>
  );
}
