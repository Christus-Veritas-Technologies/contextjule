/**
 * One price, no subscription, no account. The launch price is a Dodo discount
 * code on the same product, not a second product — so paid, discounted and free
 * promotional checkouts all take one code path and all issue a license key.
 */
export const PRICE = {
  /** Minor units, USD. */
  full: 999,
  launch: 499,
  currency: "USD",
} as const;

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
    note: "A capped percentage code. The struck-through price on the site.",
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
