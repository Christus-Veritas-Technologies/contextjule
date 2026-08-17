"use client";

import { formatPrice } from "@contextjule/core/format";
import type { PromoState } from "@contextjule/core/promo";
import { Button } from "@contextjule/ui/components/button";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@contextjule/ui/components/sheet";
import { TitleMark } from "@contextjule/ui/components/window-frame";
import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useLivePhase, usePromo } from "@/lib/use-promo";

const LINKS = [
  { href: "#how", label: "how it works" },
  { href: "#states", label: "what you see" },
  { href: "#buy", label: "price" },
  { href: "/download", label: "download" },
] as const;

/**
 * The sticky nav.
 *
 * The design sheet has one row of links and a gold plate on the right, at a
 * fixed 1100px minimum width. Below that the links do not fit, so they move
 * into a sheet — the CTA does not, because the whole page exists to be clicked
 * and hiding the button behind a hamburger would be a strange thing to do.
 */
export function SiteNav({ promo: initial }: { promo: PromoState }) {
  const promo = useLivePhase(usePromo(initial));
  const [open, setOpen] = useState(false);

  const cta =
    promo.phase === "free"
      ? `free · ${promo.freeRemaining} left`
      : `buy · ${formatPrice(promo.amount)}`;

  return (
    <nav className="sticky top-0 z-40 flex h-[68px] items-center justify-between gap-4 border-b-2 border-night-rule bg-night px-5 md:gap-8 md:px-10">
      <Link href="/" className="flex shrink-0 items-center gap-3">
        <span className="pixelated block">
          <TitleMark />
        </span>
        <span className="font-pixel text-[13px] tracking-[0.04em] text-[#f4efe9] md:text-[15px]">
          contextjule
        </span>
      </Link>

      <div className="hidden items-center gap-7 lg:flex">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="font-pixel text-[11px] whitespace-nowrap text-[#c9c3d4] transition-colors hover:text-gold"
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Link href="#buy" className="shrink-0">
          <Button size="sm" variant="primary" className="md:h-[42px] md:px-[18px] md:text-[11px]">
            {cta}
          </Button>
        </Link>

        <Sheet open={open} onOpenChange={setOpen}>
          {/* A real trigger rather than a button that sets state: it is what
              gives the sheet somewhere to return focus when it closes. */}
          <SheetTrigger
            render={
              <Button variant="dark" size="icon-sm" aria-label="Open menu" className="lg:hidden">
                <MenuIcon className="size-4" />
              </Button>
            }
          />

          <SheetContent side="right" aria-label="Menu">
            <SheetHeader>
              <span className="pixelated block">
                <TitleMark />
              </span>
              <SheetTitle>contextjule</SheetTitle>
            </SheetHeader>

            <SheetBody>
              {LINKS.map((link) => (
                <SheetClose
                  key={link.href}
                  render={
                    <Link
                      href={link.href}
                      className="border-b-2 border-night-rule px-1 py-4 font-pixel text-[12px] text-[#c9c3d4] transition-colors hover:text-gold"
                    >
                      {link.label}
                    </Link>
                  }
                />
              ))}
            </SheetBody>

            <SheetFooter>
              <span className="font-pixel text-[9px] text-[#968fa3]">
                {promo.phase === "free"
                  ? `${promo.freeRemaining} free copies left`
                  : `${formatPrice(promo.amount)} · one machine, yours`}
              </span>
              <SheetClose
                render={
                  <Link href="#buy">
                    <Button size="lg" variant="primary" className="w-full">
                      {promo.phase === "free" ? "get it free" : "buy now"}
                    </Button>
                  </Link>
                }
              />
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
