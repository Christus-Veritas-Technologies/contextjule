"use client";

import type { PromoState } from "@contextjule/core/promo";

/**
 * Analytics, as a small typed surface rather than `gtag(...)` sprinkled around.
 *
 * Three things this buys:
 *
 *   1. It no-ops safely. `gtag` is absent during server rendering, before the
 *      script loads, when the id is unset, and for every visitor running an ad
 *      blocker — which is a lot of the developer audience this product sells
 *      to. None of those may throw inside a click handler that also starts a
 *      checkout.
 *   2. The event names are fixed in one place. GA4 silently accepts any string,
 *      so a typo does not fail — it just creates a second event that reports
 *      zero forever and is never noticed.
 *   3. `begin_checkout` and `purchase` are GA4's own reserved names, spelled
 *      exactly, so they populate the built-in ecommerce reports instead of
 *      sitting in a custom-event list nobody opens.
 */
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function send(event: string, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  try {
    window.gtag("event", event, params);
  } catch {
    // Measurement is never worth breaking a purchase over.
  }
}

/** Which phase a visitor actually saw. The one number that explains the rest. */
export function trackPromoView(promo: PromoState): void {
  send("promo_view", {
    promo_phase: promo.phase,
    free_remaining: promo.freeRemaining,
    price_minor: promo.amount,
  });
}

/** They clicked buy. GA4 reserved name — feeds the funnel report. */
export function trackBeginCheckout(promo: PromoState): void {
  send("begin_checkout", {
    currency: "USD",
    value: promo.amount / 100,
    promo_phase: promo.phase,
    items: [{ item_id: "contextjule", item_name: "ContextJule", price: promo.amount / 100 }],
  });
}

/**
 * They clicked buy and it did not start.
 *
 * Worth its own event: a click that produces no checkout is invisible in the
 * funnel otherwise, and the two reasons mean very different things — one is a
 * returning customer, the other is a race with the phase changing.
 */
export function trackCheckoutBlocked(reason: string): void {
  send("checkout_blocked", { reason });
}

/**
 * The purchase completed. GA4 reserved name.
 *
 * `transaction_id` is what makes GA4 de-duplicate, and it matters here because
 * the thanks page can be refreshed — see the guard in `thanks-panel.tsx`.
 */
export function trackPurchase(input: {
  transactionId: string;
  valueMinor: number | null;
  currency?: string;
  free: boolean;
}): void {
  send("purchase", {
    transaction_id: input.transactionId,
    currency: input.currency ?? "USD",
    value: (input.valueMinor ?? 0) / 100,
    promo_phase: input.free ? "free" : "paid",
    items: [{ item_id: "contextjule", item_name: "ContextJule" }],
  });
}

/** Someone lost their email and asked for it again. A support-load signal. */
export function trackResendRequested(): void {
  send("download_link_resent");
}
