import { describe, expect, it } from "bun:test";

import { LAUNCH_PERCENT_OFF, PRICE } from "../pricing";
import {
  countdown,
  ctaLabel,
  DISCOUNT_WINDOW_MS,
  FREE_LIMIT,
  pad2,
  promoState,
  urgencyLine,
} from "../promo";

/**
 * The promotion decides what a visitor is charged, so the interesting cases are
 * the ones where an honest mistake costs money: a refund reopening a closed
 * giveaway, a window that never opens because no webhook stamped the close, a
 * clock that has already run past the end.
 */
const NOW = Date.UTC(2026, 7, 17, 12, 0, 0);

describe("promoState — free phase", () => {
  it("is free while copies remain and nothing has closed it", () => {
    const state = promoState({ freeLimit: 100, freeClaimed: 37, freeClosedAt: null }, NOW);
    expect(state.phase).toBe("free");
    expect(state.offer).toBe("free");
    expect(state.amount).toBe(0);
    expect(state.freeRemaining).toBe(63);
    expect(state.strikeAmount).toBe(PRICE.full);
  });

  it("never reports a negative remaining count", () => {
    const state = promoState({ freeLimit: 100, freeClaimed: 140, freeClosedAt: null }, NOW);
    expect(state.freeRemaining).toBe(0);
    expect(state.phase).not.toBe("free");
  });

  it("opens the window immediately when the count is spent but nothing stamped it", () => {
    // The hundredth payment succeeded and the webhook has not landed. The page
    // must show a price, not a phase with nothing on it.
    const state = promoState({ freeLimit: 100, freeClaimed: 100, freeClosedAt: null }, NOW);
    expect(state.phase).toBe("discount");
    expect(state.msRemaining).toBe(DISCOUNT_WINDOW_MS);
  });

  it("treats a zero limit as no giveaway at all", () => {
    expect(promoState({ freeLimit: 0, freeClaimed: 0, freeClosedAt: null }, NOW).phase).toBe(
      "discount",
    );
  });
});

describe("promoState — discount phase", () => {
  const closedAt = new Date(NOW - 1 * 60 * 60 * 1_000);

  it("prices at the launch price with the list price struck", () => {
    const state = promoState({ freeLimit: 100, freeClaimed: 100, freeClosedAt: closedAt }, NOW);
    expect(state.phase).toBe("discount");
    expect(state.offer).toBe("launch");
    expect(state.amount).toBe(PRICE.launch);
    expect(state.strikeAmount).toBe(PRICE.full);
    expect(state.percentOff).toBe(LAUNCH_PERCENT_OFF);
  });

  it("counts down from the moment the last copy went, not from now", () => {
    const state = promoState({ freeLimit: 100, freeClaimed: 100, freeClosedAt: closedAt }, NOW);
    expect(state.msRemaining).toBe(DISCOUNT_WINDOW_MS - 60 * 60 * 1_000);
    expect(state.endsAt).toBe(new Date(closedAt.getTime() + DISCOUNT_WINDOW_MS).toISOString());
  });

  it("accepts the closed timestamp as an ISO string, the way JSON delivers it", () => {
    const fromJson = promoState(
      { freeLimit: 100, freeClaimed: 100, freeClosedAt: closedAt.toISOString() },
      NOW,
    );
    const fromDate = promoState({ freeLimit: 100, freeClaimed: 100, freeClosedAt: closedAt }, NOW);
    expect(fromJson).toEqual(fromDate);
  });

  it("does not reopen the giveaway when a refund drops the count back under the limit", () => {
    // This is the case that costs real goodwill: someone paid $4.99 an hour ago
    // and the site starts offering free copies again behind them.
    const state = promoState({ freeLimit: 100, freeClaimed: 99, freeClosedAt: closedAt }, NOW);
    expect(state.phase).toBe("discount");
    expect(state.freeRemaining).toBe(0);
  });

  it("ignores an unparseable timestamp rather than producing a NaN countdown", () => {
    const state = promoState(
      { freeLimit: 100, freeClaimed: 100, freeClosedAt: "not-a-date" },
      NOW,
    );
    expect(Number.isFinite(state.msRemaining)).toBe(true);
    expect(state.phase).toBe("discount");
  });

  it("honours a custom window length", () => {
    const state = promoState(
      { freeLimit: 100, freeClaimed: 100, freeClosedAt: closedAt, discountWindowMs: 3_600_000 },
      NOW,
    );
    expect(state.msRemaining).toBe(0);
    expect(state.phase).toBe("full");
  });
});

describe("promoState — full phase", () => {
  const longAgo = new Date(NOW - DISCOUNT_WINDOW_MS - 1);

  it("charges list price with nothing struck once the window has run out", () => {
    const state = promoState({ freeLimit: 100, freeClaimed: 100, freeClosedAt: longAgo }, NOW);
    expect(state.phase).toBe("full");
    expect(state.offer).toBe("full");
    expect(state.amount).toBe(PRICE.full);
    expect(state.strikeAmount).toBeNull();
    expect(state.endsAt).toBeNull();
  });

  it("closes exactly at the boundary, not a tick after", () => {
    const closedAt = new Date(NOW - DISCOUNT_WINDOW_MS);
    expect(promoState({ freeLimit: 100, freeClaimed: 100, freeClosedAt: closedAt }, NOW).phase).toBe(
      "full",
    );
    expect(
      promoState({ freeLimit: 100, freeClaimed: 100, freeClosedAt: closedAt }, NOW - 1).phase,
    ).toBe("discount");
  });

  it("never goes backwards through the phases as time moves forward", () => {
    const record = { freeLimit: 100, freeClaimed: 100, freeClosedAt: new Date(NOW) };
    const order = { free: 0, discount: 1, full: 2 };
    let previous = -1;
    for (let hours = 0; hours <= 96; hours += 1) {
      const phase = promoState(record, NOW + hours * 3_600_000).phase;
      expect(order[phase]).toBeGreaterThanOrEqual(previous);
      previous = order[phase];
    }
  });
});

describe("countdown", () => {
  it("splits a 72-hour window without capping the hours at a day", () => {
    expect(countdown(DISCOUNT_WINDOW_MS)).toMatchObject({ hours: 72, minutes: 0, seconds: 0 });
  });

  it("splits an awkward remainder", () => {
    const ms = (5 * 3_600 + 7 * 60 + 9) * 1_000 + 640;
    expect(countdown(ms)).toMatchObject({ hours: 5, minutes: 7, seconds: 9 });
  });

  it("floors to zero rather than going negative", () => {
    expect(countdown(-5_000)).toMatchObject({ hours: 0, minutes: 0, seconds: 0, expired: true });
  });

  it("is only expired at exactly zero", () => {
    expect(countdown(1).expired).toBe(false);
    expect(countdown(0).expired).toBe(true);
  });
});

describe("copy", () => {
  const free = (remaining: number) =>
    promoState({ freeLimit: FREE_LIMIT, freeClaimed: FREE_LIMIT - remaining, freeClosedAt: null }, NOW);

  it("counts down in the button label", () => {
    expect(ctaLabel(free(63))).toBe("Get it free — 63 left");
  });

  it("does not say '1 people'", () => {
    expect(ctaLabel(free(1))).toBe("Get it free — 1 left");
    expect(urgencyLine(free(1))).toBe("just 1 person left · then it is gone");
  });

  it("drops the urgency line entirely outside the free phase", () => {
    const discount = promoState(
      { freeLimit: 100, freeClaimed: 100, freeClosedAt: new Date(NOW) },
      NOW,
    );
    expect(urgencyLine(discount)).toBeNull();
    expect(ctaLabel(discount)).toBe("Buy now");
  });

  it("pads to two digits", () => {
    expect(pad2(0)).toBe("00");
    expect(pad2(7)).toBe("07");
    expect(pad2(72)).toBe("72");
  });
});
