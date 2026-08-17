import type { Context, Next } from "hono";

import { tooMany } from "./http";

/**
 * A fixed-window rate limiter, in memory.
 *
 * Deliberately not distributed. The endpoints worth limiting here are the ones
 * a script could hammer — free claims, resend-my-link, licence activation — and
 * for those the real ceilings live elsewhere: Dodo enforces the free code's
 * usage cap, and a download token expires on its own. This exists so one loop
 * cannot spend those ceilings in a minute, not as an authorisation boundary.
 *
 * If this ever runs on more than one instance, the honest options are Redis or
 * accepting that the effective limit is `limit × instances`. Do not reach for a
 * database table: a limiter that writes a row per request is a denial of
 * service with extra steps.
 */
export interface RateLimitResult {
  readonly allowed: boolean;
  readonly remaining: number;
  /** Epoch millis when the window rolls over. */
  readonly resetAt: number;
}

interface Window {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private readonly windows = new Map<string, Window>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  check(key: string, now: number = Date.now()): RateLimitResult {
    const existing = this.windows.get(key);

    if (!existing || now >= existing.resetAt) {
      const resetAt = now + this.windowMs;
      this.windows.set(key, { count: 1, resetAt });
      this.sweep(now);
      return { allowed: true, remaining: this.limit - 1, resetAt };
    }

    if (existing.count >= this.limit) {
      return { allowed: false, remaining: 0, resetAt: existing.resetAt };
    }

    existing.count += 1;
    return {
      allowed: true,
      remaining: this.limit - existing.count,
      resetAt: existing.resetAt,
    };
  }

  /**
   * Drop expired windows so the map cannot grow without bound.
   *
   * Swept on write rather than on a timer — an interval would keep the process
   * awake and would have to be torn down in tests.
   */
  private sweep(now: number): void {
    if (this.windows.size < 512) return;
    for (const [key, window] of this.windows) {
      if (now >= window.resetAt) this.windows.delete(key);
    }
  }

  /** Testing seam, and the reset a deploy gets for free. */
  clear(): void {
    this.windows.clear();
  }

  /** How many windows are currently held. Only used to assert the sweep works. */
  get size(): number {
    return this.windows.size;
  }
}

/**
 * A Hono middleware around one limiter.
 *
 * Keyed by caller address. A request with no discernible address is let
 * through rather than sharing one bucket with every other anonymous caller —
 * lumping them together would let one of them lock out all the rest.
 */
export function rateLimit(limiter: RateLimiter, keyOf: (c: Context) => string | undefined) {
  return async (c: Context, next: Next) => {
    const key = keyOf(c);
    if (!key) return next();

    const result = limiter.check(key);
    c.header("x-ratelimit-remaining", String(result.remaining));
    c.header("x-ratelimit-reset", String(Math.ceil(result.resetAt / 1000)));

    if (!result.allowed) {
      c.header("retry-after", String(Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))));
      throw tooMany("rate_limited", "Too many requests. Give it a moment.");
    }

    await next();
  };
}
