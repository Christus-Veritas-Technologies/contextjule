/**
 * One price, no subscription, no account. Every offer is a discount code
 * applied to the one product — `launch` is a percentage code and `free` is a
 * 100% code with a usage cap — so paid, discounted and free checkouts all take
 * one code path and all issue a license key.
 *
 * The launch sequence the site runs is in `promo.ts`. This file is only the
 * money.
 */
export const PRICE = {
  /** Minor units, USD. The list price, struck through during a promotion. */
  full: 1499,
  /** The 72-hour price after the free copies run out. */
  launch: 499,
  currency: "USD",
} as const;

/** `67` — how much off the launch price is, rounded for display. */
export const LAUNCH_PERCENT_OFF = Math.round(((PRICE.full - PRICE.launch) / PRICE.full) * 100);

/**
 * How a checkout was reached. Every offer is a discount code applied to the one
 * product; `free` is a 100% code with a usage cap, which is what keeps a free
 * promotion limited without a second delivery path to protect.
 */
export const OFFERS = ["full", "launch", "free"] as const;
export type Offer = (typeof OFFERS)[number];

export interface OfferSpec {
  readonly id: Offer;
  readonly label: string;
  /** Minor units the customer pays. */
  readonly amount: number;
  /** Env var holding the Dodo discount code, if the offer needs one. */
  readonly discountEnvVar: string | null;
  readonly note: string;
}

export const OFFER_SPECS: Readonly<Record<Offer, OfferSpec>> = {
  full: {
    id: "full",
    label: "Buy now",
    amount: PRICE.full,
    discountEnvVar: null,
    note: "List price. No code applied.",
  },
  launch: {
    id: "launch",
    label: "Launch price",
    amount: PRICE.launch,
    discountEnvVar: "DODO_LAUNCH_DISCOUNT_CODE",
    note: "A capped percentage code, live for 72 hours after the free copies run out.",
  },
  free: {
    id: "free",
    label: "Claim free copy",
    amount: 0,
    discountEnvVar: "DODO_FREE_DISCOUNT_CODE",
    note: "A 100% code with a usage limit and first-time-customer eligibility. Still issues a license key.",
  },
};

export function isFree(offer: Offer): boolean {
  return OFFER_SPECS[offer].amount === 0;
}
