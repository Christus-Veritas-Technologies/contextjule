/**
 * The launch sequence.
 *
 * Three phases, in order, and the product never goes backwards through them:
 *
 *   free      the first N copies are given away. The button says how many are
 *             left, which is the whole point — a number that visibly shrinks
 *             is the urgency, not a date nobody can verify.
 *   discount  the moment the last free copy is claimed, a 72-hour window opens
 *             at the launch price. The clock starts from that claim, not from
 *             a date we picked, so it is honest: it really did start when the
 *             hundredth person got theirs.
 *   full      list price, forever.
 *
 * Everything here is a pure function of `{ claimed, closedAt, now }`. The
 * server owns those three values; the browser only renders them. That split is
 * deliberate — a countdown computed in the browser is a countdown anyone can
 * reset by changing their system clock, and the phase decides what someone is
 * charged.
 */
import { LAUNCH_PERCENT_OFF, PRICE, type Offer } from "./pricing";

export const PROMO_PHASES = ["free", "discount", "full"] as const;
export type PromoPhase = (typeof PROMO_PHASES)[number];

/** How many copies are given away before the discount window opens. */
export const FREE_LIMIT = 100;

/** How long the launch price runs once the free copies are gone. */
export const DISCOUNT_WINDOW_MS = 72 * 60 * 60 * 1_000;

/** What the server stores. Nothing derived, so there is one source of truth. */
export interface PromoRecord {
  readonly freeLimit: number;
  readonly freeClaimed: number;
  /**
   * When the last free copy was claimed. Null while copies remain — and it
   * stays set forever after, which is what stops the window from restarting if
   * a refund ever takes the claimed count back below the limit.
   */
  readonly freeClosedAt: Date | string | null;
  readonly discountWindowMs?: number;
}

export interface PromoState {
  readonly phase: PromoPhase;
  /** The offer a checkout started right now should use. */
  readonly offer: Offer;
  /** Minor units the buyer pays in this phase. */
  readonly amount: number;
  /** Minor units struck through beside it, or null when nothing is struck. */
  readonly strikeAmount: number | null;
  readonly percentOff: number;
  readonly freeLimit: number;
  readonly freeClaimed: number;
  /** Never negative, never above the limit. */
  readonly freeRemaining: number;
  /** ISO 8601. When the discount window closes, or null outside it. */
  readonly endsAt: string | null;
  /** Milliseconds left in the discount window. Zero outside it. */
  readonly msRemaining: number;
}

function toMs(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const ms = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * The whole promotion, resolved.
 *
 * `closedAt` is what decides the phase, not the count. A refund that takes
 * `freeClaimed` back to 99 must not reopen a promotion that has already been
 * announced as over — people who paid $4.99 an hour earlier would be right to
 * be annoyed.
 */
export function promoState(record: PromoRecord, now: number = Date.now()): PromoState {
  const freeLimit = Math.max(0, Math.floor(record.freeLimit));
  const freeClaimed = Math.max(0, Math.floor(record.freeClaimed));
  const freeRemaining = Math.max(0, freeLimit - freeClaimed);
  const windowMs = record.discountWindowMs ?? DISCOUNT_WINDOW_MS;

  const closedAt = toMs(record.freeClosedAt);
  const stillFree = closedAt === null && freeRemaining > 0;

  if (stillFree) {
    return {
      phase: "free",
      offer: "free",
      amount: 0,
      strikeAmount: PRICE.full,
      percentOff: 100,
      freeLimit,
      freeClaimed,
      freeRemaining,
      endsAt: null,
      msRemaining: 0,
    };
  }

  // The count reached the limit but no webhook has stamped the close yet. Treat
  // `now` as the close so the window opens immediately rather than leaving the
  // page in a phase with no price on it.
  const closed = closedAt ?? now;
  const endsAt = closed + windowMs;
  const msRemaining = Math.max(0, endsAt - now);

  if (msRemaining > 0) {
    return {
      phase: "discount",
      offer: "launch",
      amount: PRICE.launch,
      strikeAmount: PRICE.full,
      percentOff: LAUNCH_PERCENT_OFF,
      freeLimit,
      freeClaimed,
      freeRemaining: 0,
      endsAt: new Date(endsAt).toISOString(),
      msRemaining,
    };
  }

  return {
    phase: "full",
    offer: "full",
    amount: PRICE.full,
    strikeAmount: null,
    percentOff: 0,
    freeLimit,
    freeClaimed,
    freeRemaining: 0,
    endsAt: null,
    msRemaining: 0,
  };
}

/**
 * The countdown, split so it can be drawn as pixel digits.
 *
 * Hours are not capped at 24: a 72-hour window reading `71` is more legible
 * than `2d 23h`, and it keeps the plate to one row of digits on a phone.
 */
export interface Countdown {
  readonly hours: number;
  readonly minutes: number;
  readonly seconds: number;
  readonly total: number;
  readonly expired: boolean;
}

export function countdown(msRemaining: number): Countdown {
  const total = Math.max(0, Math.floor(msRemaining));
  const seconds = Math.floor(total / 1_000);
  return {
    hours: Math.floor(seconds / 3_600),
    minutes: Math.floor((seconds % 3_600) / 60),
    seconds: seconds % 60,
    total,
    expired: total === 0,
  };
}

/** `02` — two digits, because a countdown that changes width jitters. */
export function pad2(value: number): string {
  return Math.max(0, Math.floor(value)).toString().padStart(2, "0");
}

/**
 * The urgency line under the button.
 *
 * Singular at one, because "1 people left" is the sort of thing that makes a
 * page look automated at exactly the moment it most needs to look real.
 */
export function urgencyLine(state: PromoState): string | null {
  if (state.phase !== "free") return null;
  if (state.freeRemaining <= 0) return null;
  return state.freeRemaining === 1
    ? "just 1 person left · then it is gone"
    : `just ${state.freeRemaining} people left`;
}

/** What the primary button says, in every phase. */
export function ctaLabel(state: PromoState): string {
  if (state.phase === "free") return `Get it free — ${state.freeRemaining} left`;
  return "Buy now";
}
