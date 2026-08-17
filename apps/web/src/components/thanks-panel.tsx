"use client";

import { Button } from "@contextjule/ui/components/button";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { type CheckoutStatus, fetchCheckoutStatus } from "@/lib/api";
import { recallCheckout } from "@/lib/session";

/**
 * The checkout return page.
 *
 * Dodo redirects back the instant the card clears, which is almost always
 * before its webhook reaches us — so the key genuinely does not exist yet when
 * this page first paints. The honest thing is to say so and keep looking, which
 * is what this does. Claiming failure in that window would send people to
 * support for something that resolves itself in four seconds.
 *
 * The session id comes from `POST /api/checkout`, stashed in sessionStorage
 * before the redirect. Dodo's return URL query string is used when it is there,
 * but it is not relied on: what it appends varies, and a page that only works
 * when a third party sends the right parameter is a page that breaks quietly.
 */

/** How long to keep asking before suggesting the inbox instead. */
const GIVE_UP_AFTER_MS = 90_000;

export function ThanksPanel({ sessionId: fromUrl }: { sessionId?: string }) {
  const [status, setStatus] = useState<CheckoutStatus | null>(null);
  const [waiting, setWaiting] = useState(true);
  const [sessionId, setSessionId] = useState<string | undefined>(fromUrl);

  useEffect(() => {
    if (sessionId) return;
    const stored = recallCheckout();
    if (stored) setSessionId(stored);
    else setWaiting(false);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    const startedAt = Date.now();

    const poll = async () => {
      if (cancelled) return;
      try {
        const next = await fetchCheckoutStatus(sessionId);
        if (cancelled) return;
        if (next) setStatus(next);
        // Stop the moment the key is in hand — nothing after that changes.
        if (next?.licenseKey) {
          setWaiting(false);
          return;
        }
      } catch {
        // A failed poll is not a failed purchase. Keep trying.
      }

      if (Date.now() - startedAt > GIVE_UP_AFTER_MS) {
        setWaiting(false);
        return;
      }
      // Every second and a half: fast enough to feel instant, slow enough that
      // a thousand people landing at once is not a problem of our own making.
      setTimeout(poll, 1_500);
    };

    void poll();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const key = status?.licenseKey ?? null;
  const failed = status && !status.paid && !waiting;

  return (
    <div className="flex w-full max-w-[560px] flex-col gap-6 border-3 border-ink bg-night-raised p-6 shadow-hard-xl md:p-8">
      <h1 className="font-pixel text-[15px] text-cream md:text-[17px]">
        {failed ? "that did not go through" : "she is yours"}
      </h1>

      {failed ? (
        <>
          <p className="text-[14px] leading-[1.6] text-[#a8a2b4]">
            Nothing was charged. Head back and try again, or write to us and we will sort it out.
          </p>
          <Link href="/">
            <Button size="lg" variant="primary">
              back to the page
            </Button>
          </Link>
        </>
      ) : (
        <>
          {key ? (
            <div className="flex flex-col gap-2">
              <span className="font-pixel text-[9px] text-[#968fa3]">your licence key</span>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard
                    ?.writeText(key)
                    .then(() => toast.success("key copied"))
                    .catch(() => toast.error("could not copy — select it and copy by hand"));
                }}
                className="border-3 border-ink-soft bg-gold px-4 py-3.5 text-left font-pixel text-[12px] tracking-[0.1em] break-all text-ink-soft transition-colors hover:bg-gold-hover md:text-[13px]"
              >
                {key}
              </button>
              <span className="font-pixel text-[8px] text-[#968fa3]">click to copy</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3 border-3 border-night-rule bg-[#241f2f] p-5">
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className={`block size-[7px] ${waiting ? "animate-pulse bg-gold" : "bg-asleep"}`}
                />
                <span className="font-pixel text-[10px] text-[#c9c3d4]">
                  {waiting ? "issuing your licence key…" : "it is on its way by email"}
                </span>
              </div>
              <p className="text-[13px] leading-[1.6] text-[#968fa3]">
                {waiting
                  ? "This takes a few seconds. Leave the page open and it will appear right here."
                  : "Your key and download link are being emailed to you. If it has not arrived in a few minutes, check spam, then ask for it again on the download page."}
              </p>
            </div>
          )}

          <p className="text-[14px] leading-[1.6] text-[#a8a2b4]">
            The same key and a download link are on their way to your inbox. Paste the key into the
            app the first time you open it — it does not expire, and it works on your machines.
          </p>

          <Link
            href="/download"
            className="font-pixel text-[10px] text-gold transition-colors hover:text-gold-hover"
          >
            download for windows and mac →
          </Link>
        </>
      )}
    </div>
  );
}
