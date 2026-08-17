import { HeroStage } from "@/components/hero-stage";
import { PromoCta } from "@/components/promo-cta";
import { WhatItGivesYou, WhatItIs, WhatYouSee } from "@/components/sections";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { fetchPromo } from "@/lib/api";

/**
 * The landing page.
 *
 * Four bands under the hero, each a different daylight colour, so scrolling
 * reads as time passing rather than as one long dark page. The hero band is her
 * stage, not a picture of her.
 *
 * The promotion is fetched on the server so the first paint already has the
 * right number in the button — a counter that appears a beat after the page
 * does is a counter people scroll past. It is then kept live over a stream.
 */
export const dynamic = "force-dynamic";

export default async function Home() {
  const promo = await fetchPromo();

  return (
    <main className="min-h-svh bg-night">
      <SiteNav promo={promo} />

      <HeroStage>
        <div className="inline-flex items-center gap-2 self-start bg-ink-soft px-3 py-[7px] shadow-[3px_3px_0_rgba(34,27,44,0.35)]">
          <span aria-hidden className="block size-[8px] bg-fresh" />
          <span className="font-pixel text-[9px] text-[#e8e2d6] md:text-[10px]">
            lives on your desktop, not in your browser
          </span>
        </div>

        <h1 className="font-pixel text-[27px] leading-[1.24] tracking-[-0.5px] text-[#1b1526] [text-shadow:3px_3px_0_rgba(255,255,255,0.4)] sm:text-[32px] lg:text-[40px]">
          Your context
          <br />
          window, with
          <br />
          a pulse.
        </h1>

        <p className="max-w-[420px] text-[15px] leading-[1.6] font-medium text-pretty text-[#1d2c44] md:text-[16px]">
          She watches your Claude Code and Codex sessions and carries the context for you. Light at
          five thousand tokens, flat on the floor at a hundred and twenty thousand, asking if you
          want to start fresh.
        </p>

        <PromoCta promo={promo} size="xl" anchorId="buy" />
      </HeroStage>

      <WhatItIs />
      <WhatYouSee />
      <WhatItGivesYou />

      {/* Price. Grass green, the CTA repeated at full size. */}
      <section className="relative overflow-hidden border-t-[6px] border-[#6dbd5e] bg-[#5aa84f] px-5 pt-16 pb-24 md:px-10 md:pt-24 md:pb-[150px]">
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-[70px] bg-[#4f9846]" />
        <div className="relative z-[2] mx-auto flex max-w-[660px] flex-col items-center gap-6 text-center">
          <span className="font-pixel text-[11px] text-[#1f3c1c]">
            one price, one machine, yours
          </span>
          <h2 className="font-pixel text-[24px] leading-[1.28] text-[#152a12] [text-shadow:3px_3px_0_rgba(255,255,255,0.35)] md:text-[34px]">
            Buy her once. She stays.
          </h2>
          <p className="text-[15px] leading-[1.65] font-medium text-pretty text-[#1d3719] md:text-[16px]">
            No subscription, no account, no telemetry. Windows and macOS, twenty animations and
            every state above included.
          </p>
          <PromoCta promo={promo} size="xl" align="center" />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
