"use client";

import { formatPrice } from "@contextjule/core/format";
import { ctaLabel, type PromoState, urgencyLine } from "@contextjule/core/promo";
import { Button } from "@contextjule/ui/components/button";
import { cn } from "@contextjule/ui/lib/utils";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  trackBeginCheckout,
  trackCheckoutBlocked,
  trackPromoView,
} from "@/lib/analytics";
import { ApiError, startCheckout } from "@/lib/api";
import { rememberCheckout } from "@/lib/session";
import { useLivePhase, usePromo } from "@/lib/use-promo";

import { PixelCountdown } from "./pixel-countdown";

/**
 * The buy button, and everything that hangs off it.
 *
 * Three phases, and the copy is the product decision, not decoration:
 *
 *   free      $14.99 struck through, "Get it free — 63 left". The number is
 *             the urgency. It is fetched from the server and pushed live, so
 *             it moves while somebody is reading the page.
 *   discount  the giveaway is over and the page says so plainly, then offers
 *             $4.99 with the 72-hour clock under it. Owning the fact that they
 *             missed it is what makes the second offer land.
 *   full      $14.99, no theatre.
 *
 * The offer sent to the server is what this button believed it was showing. If
 * the phase moved between render and click the server returns 409 and the page
 * refreshes rather than charging a price nobody agreed to.
 */
export function PromoCta({
  promo: initial,
  size = "xl",
  align = "start",
  showCountdown = true,
  anchorId,
}: {
  promo: PromoState;
  size?: "lg" | "xl";
  align?: "start" | "center";
  showCountdown?: boolean;
  /** Only one instance on a page may carry `buy` — ids have to be unique. */
  anchorId?: string;
}) {
  const promo = useLivePhase(usePromo(initial));
  const [pending, setPending] = useState(false);

  const centred = align === "center";
  const urgency = urgencyLine(promo);

  /**
   * Report the phase this visitor was actually shown, once.
   *
   * Only from the instance that owns the `buy` anchor — the CTA renders twice
   * on the landing page, and firing from both would double every phase count
   * and make the conversion rate read as half what it is.
   */
  const reported = useRef(false);
  useEffect(() => {
    if (!anchorId || reported.current) return;
    reported.current = true;
    trackPromoView(promo);
  }, [anchorId, promo]);

  async function buy() {
    setPending(true);
    trackBeginCheckout(promo);
    try {
      const { checkoutUrl, sessionId } = await startCheckout({ expectedOffer: promo.offer });
      // Written before the redirect, so the thanks page can ask about this
      // exact purchase rather than depending on what Dodo appends on the way
      // back.
      rememberCheckout(sessionId);
      window.location.href = checkoutUrl;
    } catch (error) {
      trackCheckoutBlocked(error instanceof ApiError ? error.code : "unknown");
      if (error instanceof ApiError && error.code === "offer_moved") {
        toast.message(error.message, {
          action: { label: "refresh", onClick: () => window.location.reload() },
        });
      } else {
        toast.error(error instanceof Error ? error.message : "Something went wrong.");
      }
      setPending(false);
    }
  }

  return (
    <div
      id={anchorId}
      className={cn(
        "flex scroll-mt-[84px] flex-col gap-3",
        centred ? "items-center" : "items-start",
      )}
    >
      {/* The apology, before the offer. Only after the giveaway has closed. */}
      {promo.phase === "discount" ? (
        <div
          className={cn(
            "flex max-w-[46ch] flex-col gap-1.5 border-3 border-ink-soft bg-ink-soft px-4 py-3 shadow-hard-sm",
            centred && "text-center",
          )}
        >
          <span className="font-pixel text-[10px] text-gold">missed the promotion</span>
          <p className="text-[13px] leading-[1.55] text-[#c9c3d4]">
            We gave ContextJule away to {promo.freeLimit} people for free. That run is over — but
            you can still have it for {formatPrice(promo.amount)}, {promo.percentOff}% off, for the
            next 72 hours.
          </p>
        </div>
      ) : null}

      <Button
        size={size}
        variant="primary"
        disabled={pending}
        onClick={buy}
        className="max-w-full gap-3.5 px-6 md:gap-4 md:px-7"
      >
        {pending ? (
          "one moment…"
        ) : (
          <>
            <span className="truncate">{ctaLabel(promo)}</span>
            <span
              aria-hidden
              className={cn(
                "block w-[2px] bg-ink-soft/25",
                size === "xl" ? "h-[22px]" : "h-[18px]",
              )}
            />
            {promo.amount > 0 ? (
              <span className={size === "xl" ? "text-[18px]" : "text-[15px]"}>
                {formatPrice(promo.amount)}
              </span>
            ) : null}
            {promo.strikeAmount ? (
              <span
                className={cn(
                  "text-[#54390b] line-through",
                  size === "xl" ? "text-[13px]" : "text-[11px]",
                )}
              >
                {formatPrice(promo.strikeAmount)}
              </span>
            ) : null}
          </>
        )}
      </Button>

      {/* "just 63 people left" — the plate from the design sheet, live. */}
      {urgency ? (
        <div className="flex items-center gap-2.5 bg-ink-soft px-3.5 py-2.5 shadow-[3px_3px_0_rgba(34,27,44,0.3)]">
          <span aria-hidden className="block size-[7px] animate-pulse bg-crashed" />
          <span className="font-pixel text-[10px] text-[#c9c3d4]">{urgency}</span>
        </div>
      ) : null}

      {promo.phase === "discount" && showCountdown ? (
        <div className={cn("flex flex-col gap-2.5 pt-2", centred ? "items-center" : "items-start")}>
          <span className="font-pixel text-[9px] tracking-[0.12em] text-ink-soft/70">
            back to {formatPrice(promo.strikeAmount ?? 0)} in
          </span>
          <PixelCountdown endsAt={promo.endsAt} />
        </div>
      ) : null}

      {promo.phase === "free" ? (
        <span className="font-pixel text-[9px] text-[#968fa3]">
          real licence key, real invoice, no card needed
        </span>
      ) : null}

      {promo.phase === "full" ? (
        <Link
          href="/download"
          className="font-pixel text-[9px] text-[#968fa3] transition-colors hover:text-gold"
        >
          already bought it? get your link again →
        </Link>
      ) : null}
    </div>
  );
}
