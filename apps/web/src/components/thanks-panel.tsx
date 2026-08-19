"use client";

import { Button } from "@contextjule/ui/components/button";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { trackPurchase } from "@/lib/analytics";
import { type CheckoutStatus, fetchCheckoutStatus } from "@/lib/api";
import { claimPurchaseReport, recallCheckout } from "@/lib/session";

/**
 * The checkout return page.
 *
 * Dodo hands the licence key back on the return URL itself —
 * `?status=succeeded&license_key=…&payment_id=…` — so in the common case the
 * answer is already on screen before any request is made. That path is checked
 * first and short-circuits everything else.
 *
 * Polling is the fallback, for the cases where it is not: a buyer who closed
 * the tab and came back, a return URL a payment link stripped, or a status of
 * `processing` that only resolves once the webhook lands. Dodo redirects the
 * instant the card clears, which is almost always before its webhook reaches
 * us, so the honest thing in that window is to say we are still waiting rather
 * than to claim failure — that would send people to support for something that
 * resolves itself in four seconds.
 */

/** How long to keep asking before pointing at the inbox instead. */
const GIVE_UP_AFTER_MS = 90_000;

export function ThanksPanel({
  sessionId: fromUrl,
  licenseKey: keyFromUrl,
  status: statusFromUrl,
  email: emailFromUrl,
  paymentId,
}: {
  sessionId?: string;
  licenseKey?: string;
  status?: string;
  email?: string;
  paymentId?: string;
}) {
  const [status, setStatus] = useState<CheckoutStatus | null>(null);
  // Seeded from the URL, so the first paint already has it when Dodo sent it.
  const [key, setKey] = useState<string | null>(keyFromUrl ?? null);
  const [waiting, setWaiting] = useState(!keyFromUrl);
  const [sessionId, setSessionId] = useState<string | undefined>(fromUrl);

  // Dodo's own verdict, when it gave one. `succeeded` and `active` are the two
  // it uses for a completed purchase.
  const declaredOk = statusFromUrl === "succeeded" || statusFromUrl === "active";
  const declaredFail = Boolean(statusFromUrl) && !declaredOk;

  useEffect(() => {
    // The key is in hand. Nothing to look up.
    if (keyFromUrl || declaredFail) return;
    if (sessionId) return;
    const stored = recallCheckout();
    if (stored) setSessionId(stored);
    else setWaiting(false);
  }, [sessionId, keyFromUrl, declaredFail]);

  useEffect(() => {
    if (!sessionId || keyFromUrl || declaredFail) return;

    let cancelled = false;
    const startedAt = Date.now();

    const poll = async () => {
      if (cancelled) return;
      try {
        const next = await fetchCheckoutStatus(sessionId);
        if (cancelled) return;
        if (next) {
          setStatus(next);
          if (next.licenseKey) {
            setKey(next.licenseKey);
            setWaiting(false);
            return;
          }
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
  }, [sessionId, keyFromUrl, declaredFail]);

  /**
   * Report the sale, once, the moment the key is in hand.
   *
   * Fired here rather than on the redirect because this is where we actually
   * know it succeeded — Dodo bounces back on `processing` too, and counting
   * those would inflate revenue with purchases that never cleared.
   */
  useEffect(() => {
    if (!key) return;
    const transactionId = paymentId ?? sessionId ?? key;
    if (!claimPurchaseReport(transactionId)) return;
    trackPurchase({
      transactionId,
      valueMinor: status?.amountMinor ?? (statusFromUrl ? null : 0),
      currency: status?.currency,
      free: (status?.amountMinor ?? 0) === 0,
    });
  }, [key, paymentId, sessionId, status, statusFromUrl]);

  // Only ever call it a failure on evidence: Dodo said so, or we asked and were
  // told the payment did not succeed. Never merely because we are still waiting.
  const failed = declaredFail || (status !== null && !status.paid && !waiting && !key);
  const email = emailFromUrl ?? status?.email ?? null;

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
                  {waiting ? "writing your key…" : "it is on its way by email"}
                </span>
              </div>
              <p className="text-[13px] leading-[1.6] text-[#968fa3]">
                {waiting
                  ? "A few seconds, no more. Leave this open and it will land right here."
                  : "Your key and download link are being emailed to you. If nothing arrives in a few minutes, check spam, then ask for it again on the download page."}
              </p>
            </div>
          )}

          <p className="text-[14px] leading-[1.6] text-[#a8a2b4]">
            {email ? (
              <>
                A copy is on its way to <span className="text-[#c9c3d4]">{email}</span>, with your
                download link.{" "}
              </>
            ) : (
              "The same key and a download link are on their way to your inbox. "
            )}
            Paste the key in the first time you open her — it never expires, and it works on your
            machines.
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
