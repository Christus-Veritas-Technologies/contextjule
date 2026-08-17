"use client";

import { Sprite } from "@contextjule/ui/components/sprite";
import { STATES } from "@contextjule/ui/jule";
import { juleEngine } from "@contextjule/ui/jule/render";
import { useMemo } from "react";

/**
 * The three bands under the hero, each lifted from `designs/site/landing.html`.
 *
 * Every sprite is generated here rather than loaded as a PNG — same engine,
 * same palette, no image requests, and no chance of a frame going stale against
 * the app. The numbers (card widths, shadow offsets, the 96px header row) come
 * straight off the sheet.
 */

/* --------------------------------------------------------------------------
   what it is — warm parchment, white cards, hard tan shadows
-------------------------------------------------------------------------- */

const PILLARS = [
  {
    step: "01",
    title: "It watches",
    body: "The desktop agent reads the length of your Claude Code and Codex sessions on your own machine. No extension, no chat hijacking.",
    frame: () => juleEngine().action("type", 3, { fx: false }),
  },
  {
    step: "02",
    title: "She carries it",
    body: "Every thousand tokens goes into her pack. Twenty animations map to how much you are asking her to hold.",
    frame: () => juleEngine().state("heavy", 1),
  },
  {
    step: "03",
    title: "She offers a way out",
    body: "At a hundred and twenty thousand she asks whether to summarise and start fresh. One click and the pack hits the floor.",
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
          <span className="font-pixel text-[11px] text-[#a8621c]">what it is</span>
          <h2 className="font-pixel text-[21px] leading-[1.3] text-[#231b12] md:text-[30px]">
            A desktop pet that reads your context window.
          </h2>
          <p className="text-[15px] leading-[1.65] text-pretty text-[#4c3f31] md:text-[16px]">
            Context length is the one number that decides whether your session is going well, and
            nothing shows it to you. ContextJule turns it into a character who lives on your desktop
            and visibly carries the weight.
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
   what you see — dusk purple, the four load states side by side
-------------------------------------------------------------------------- */

export function WhatYouSee() {
  // `chest` is the growth screen's trophy, not a load state.
  const states = useMemo(() => STATES.filter((state) => state.id !== "chest"), []);

  return (
    <section
      id="states"
      className="scroll-mt-[68px] bg-[linear-gradient(#3a2f56,#241d38)] px-5 py-16 md:px-10 md:py-24"
    >
      <div className="mx-auto flex max-w-[1180px] flex-col gap-10 md:gap-12">
        <div className="flex max-w-[660px] flex-col gap-3.5">
          <span className="font-pixel text-[11px] text-gold-bright">what you see</span>
          <h2 className="font-pixel text-[21px] leading-[1.3] text-cream md:text-[30px]">
            Four states, read at a glance.
          </h2>
          <p className="text-[15px] leading-[1.65] text-pretty text-[#c3b8dc] md:text-[16px]">
            Her pack, her stance and her face all move together, so you know where you stand without
            reading a number.
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
                <p className="text-[13px] leading-[1.6] text-pretty text-[#c3b8dc]">{state.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------------------
   what it gives you — sky blue, the four rituals as cream rows
-------------------------------------------------------------------------- */

const RITUALS = [
  {
    when: "you open a new chat",
    what: 'She runs in from the edge of the screen and waves. "New chat. What are we building today?"',
    frame: () => juleEngine().action("wave", 5, { fx: false }),
  },
  {
    when: "you keep typing",
    what: "She leans in and listens, one ear turned toward you, until the model starts answering.",
    frame: () => juleEngine().action("listen", 2, { fx: false }),
  },
  {
    when: "the session drags",
    what: "Tea appears. It is her way of telling you the context has been open a long time.",
    frame: () => juleEngine().action("sip", 6, { fx: false }),
  },
  {
    when: "you leave her overnight",
    what: "She yawns, walks off to bed and curls up. She is still there in the morning.",
    frame: () => juleEngine().action("bed", 2, { fx: false }),
  },
] as const;

export function WhatItGivesYou() {
  const grids = useMemo(() => RITUALS.map((ritual) => ritual.frame()), []);

  return (
    <section className="bg-[linear-gradient(#8fd4f0,#cdecf8)] px-5 py-16 md:px-10 md:py-24">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-9 md:gap-11">
        <div className="flex max-w-[660px] flex-col gap-3.5">
          <span className="font-pixel text-[11px] text-[#14567e]">what it gives you</span>
          <h2 className="font-pixel text-[21px] leading-[1.3] text-sky-ink md:text-[30px]">
            She acts before you have to ask.
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
          Everything runs locally in the desktop agent. She never types into your chat, and no
          session text leaves your machine.
        </p>
      </div>
    </section>
  );
}
