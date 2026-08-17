import { MiniBar } from "@contextjule/ui/components/mini-bar";
import { Scene } from "@contextjule/ui/components/scene";
import { formatPrice } from "@contextjule/core/format";
import { PRICE } from "@contextjule/core/pricing";
import { env } from "@contextjule/env/web";

import { BuyButton } from "@/components/buy-button";
import Header from "@/components/header";
import { StateStrip } from "@/components/state-strip";

/**
 * The landing page.
 *
 * Four bands under the hero, each a different daylight colour, so scrolling
 * reads as time passing rather than as one long dark page. The hero band is her
 * stage, not a picture of her.
 */
export default function Home() {
  return (
    <main className="min-h-svh bg-night">
      <Header />

      {/* Hero. She walks the band; the copy sits on a layer above her. */}
      <section className="relative isolate overflow-hidden border-y-3 border-ink">
        <Scene className="h-[420px]" scale={5} action="walk" grassHeight={120} />
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-center gap-6 px-6 md:px-14">
          <h1 className="max-w-[16ch] font-pixel text-[26px] leading-[1.35] text-ink-soft md:text-[38px]">
            she carries your context so you can feel it
          </h1>
          <p className="max-w-[46ch] text-[15px] leading-[1.6] text-ink-soft/80">
            Context length is the one number that decides whether a session is going well, and
            nothing shows it to you. Jule turns it into a character on your desktop.
          </p>
          <div className="pointer-events-auto flex items-center gap-5">
            <BuyButton>buy now · {formatPrice(PRICE.launch)}</BuyButton>
            <span className="font-pixel text-[11px] text-ink-soft/60 line-through">
              {formatPrice(PRICE.full)}
            </span>
          </div>
          {env.NEXT_PUBLIC_LAUNCH_ENDS ? (
            <span className="font-pixel text-[9px] text-ink-soft/70">
              launch price ends {env.NEXT_PUBLIC_LAUNCH_ENDS}
            </span>
          ) : null}
        </div>
      </section>

      {/* What it is. Warm parchment, hard tan shadows. */}
      <section className="border-b-3 border-ink bg-[#f6ead6] px-6 py-20 md:px-14" data-band="">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-10">
          <h2 className="font-pixel text-[16px] text-ink-soft">what it is</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              ["Local, always", "It reads session length on your machine. No session text ever leaves the computer."],
              ["Never types", "She watches and reacts. She never touches your chat, your files or your clipboard."],
              ["One price", "No subscription, no account, no sign-in. Buy it once and it is yours."],
            ].map(([title, body]) => (
              <div key={title} className="flex flex-col gap-3 border-3 border-ink-soft bg-cream-raised p-6 shadow-[6px_6px_0_#d9c4a4]">
                <span className="font-pixel text-[11px] text-ink-soft">{title}</span>
                <p className="text-[13px] leading-[1.6] text-[#6b5b48]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What you see. Dusk purple, the four load states. */}
      <section className="border-b-3 border-ink bg-[#241d38] px-6 py-20 md:px-14">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-10">
          <h2 className="font-pixel text-[16px] text-[#f4efe9]">what you see</h2>
          <StateStrip />
        </div>
      </section>

      {/* What it gives you. Sky blue, the mini bar at its shipping size. */}
      <section className="border-b-3 border-ink bg-sky px-6 py-20 md:px-14" data-band="sky">
        <div className="mx-auto flex max-w-[1100px] flex-col items-start gap-10">
          <h2 className="font-pixel text-[16px] text-sky-ink">what it gives you</h2>
          <p className="max-w-[52ch] text-[15px] leading-[1.6] text-[#3d4f61]">
            A strip that lives above everything else, at the size it actually ships at. Four load
            states set the meter colour and her pose; six activity types swap her frame and her line.
          </p>
          <div className="flex flex-wrap gap-8">
            <MiniBar tokens={3_100} activity="idle" />
            <MiniBar tokens={48_200} activity="streaming" />
            <MiniBar tokens={168_200} activity="overload" />
          </div>
        </div>
      </section>

      {/* Price. Grass green, the CTA repeated at full size. */}
      <section id="price" className="bg-[#5aa84f] px-6 py-24 md:px-14">
        <div className="mx-auto flex max-w-[1100px] flex-col items-center gap-6 text-center">
          <h2 className="font-pixel text-[16px] text-ink-soft">one price, then it is yours</h2>
          <div className="flex items-baseline gap-4">
            <span className="font-pixel text-[38px] text-ink-soft">{formatPrice(PRICE.launch)}</span>
            <span className="font-pixel text-[16px] text-ink-soft/60 line-through">
              {formatPrice(PRICE.full)}
            </span>
          </div>
          <BuyButton>buy now</BuyButton>
          <p className="max-w-[42ch] text-[13px] leading-[1.6] text-ink-soft/80">
            Windows and macOS. Your key arrives by email and works on your machines — there is no
            account to make.
          </p>
        </div>
      </section>
    </main>
  );
}
