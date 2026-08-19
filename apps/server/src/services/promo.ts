import { DISCOUNT_WINDOW_MS, FREE_LIMIT, promoState, type PromoState } from "@contextjule/core/promo";
import prisma from "@contextjule/db";

/**
 * The launch sequence, server side.
 *
 * The browser never decides which phase it is in. It renders what this returns,
 * and `POST /api/checkout` resolves the offer from the same function — so a
 * visitor who edits the JSON, freezes their clock or replays an old response
 * gets exactly the price the server thinks they should get.
 *
 * The phase machine itself is `@contextjule/core/promo`, which is pure and
 * tested. This file is only persistence.
 */

export const PROMO_SLUG = "launch";

/**
 * A one-second cache in front of the row.
 *
 * The landing page reads this on every visit and the stream's poller reads it
 * twice a second, so without a cache the busiest page on the site would issue a
 * write (the upsert) per pageview. One second is short enough that the counter
 * still looks live and long enough to flatten a launch-day spike.
 */
const CACHE_MS = 1_000;
let cached: { at: number; row: Awaited<ReturnType<typeof readRow>> } | null = null;

function readRow() {
  // Created on first read, so a fresh database needs no seed to work.
  return prisma.promo.upsert({
    where: { slug: PROMO_SLUG },
    create: { slug: PROMO_SLUG, freeLimit: FREE_LIMIT },
    update: {},
  });
}

export async function promoRecord(fresh = false) {
  const now = Date.now();
  if (!fresh && cached && now - cached.at < CACHE_MS) return cached.row;
  const row = await readRow();
  cached = { at: now, row };
  return row;
}

/** Drop the cache so the next read sees a write this process just made. */
function invalidate(): void {
  cached = null;
}

export async function currentPromo(now: number = Date.now()): Promise<PromoState> {
  const row = await promoRecord();

  // A paused sequence is list price, immediately and without ceremony. Modelled
  // as an already-expired window rather than as a fourth phase, so every caller
  // keeps working off the same three.
  if (!row.active) {
    return promoState(
      { freeLimit: 0, freeClaimed: 0, freeClosedAt: new Date(0), discountWindowMs: 0 },
      now,
    );
  }

  return promoState(
    {
      freeLimit: row.freeLimit,
      freeClaimed: row.freeClaimed,
      freeClosedAt: row.freeClosedAt,
      discountWindowMs: row.discountHours * 60 * 60 * 1_000,
    },
    now,
  );
}

/**
 * Record one free copy going out.
 *
 * Two properties matter here and neither is free:
 *
 *   1. The increment is atomic. Two webhooks landing at once must not both read
 *      99 and both write 100 — `increment` pushes the arithmetic into the
 *      database rather than doing it in this process.
 *   2. The close is stamped exactly once. The `freeClosedAt: null` guard in the
 *      where clause is what makes that true: the second caller to reach the
 *      limit updates zero rows instead of moving the deadline forward, which
 *      would silently extend the discount window for everyone.
 */
export async function claimFreeCopy(at: Date = new Date()): Promise<PromoState> {
  const updated = await prisma.promo.update({
    where: { slug: PROMO_SLUG },
    data: { freeClaimed: { increment: 1 } },
  });

  if (updated.freeClaimed >= updated.freeLimit && updated.freeClosedAt === null) {
    await prisma.promo.updateMany({
      where: { slug: PROMO_SLUG, freeClosedAt: null },
      data: { freeClosedAt: at },
    });
  }

  invalidate();
  return currentPromo(at.getTime());
}

/**
 * Change the counter, from inside the network.
 *
 * The database is reachable only from the deployment, so the CLI in
 * `packages/db` cannot touch production from a laptop. This is the same set of
 * operations exposed over HTTP behind the admin token, so there is one mental
 * model for both — and no reason to open the database to the internet to move
 * a number.
 *
 * `reset` and `close` are opposites; `reset` wins if both arrive, rather than
 * the two silently fighting over freeClosedAt.
 */
export async function updatePromo(input: {
  freeLimit?: number;
  freeClaimed?: number;
  discountHours?: number;
  active?: boolean;
  reset?: boolean;
  close?: boolean;
}): Promise<PromoState> {
  // Ensures the row exists before the update, so a fresh deployment can be
  // configured before anyone has ever hit /api/promo.
  await promoRecord(true);

  await prisma.promo.update({
    where: { slug: PROMO_SLUG },
    data: {
      ...(input.freeLimit !== undefined ? { freeLimit: input.freeLimit } : {}),
      ...(input.freeClaimed !== undefined ? { freeClaimed: input.freeClaimed } : {}),
      ...(input.discountHours !== undefined ? { discountHours: input.discountHours } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      ...(input.reset ? { freeClaimed: 0, freeClosedAt: null } : {}),
      ...(input.close && !input.reset ? { freeClosedAt: new Date() } : {}),
    },
  });

  invalidate();
  return currentPromo();
}

/**
 * How long until the state could next change on its own.
 *
 * Used to pace the live stream. In the free phase nothing changes without a
 * purchase, so the stream leans on its heartbeat; inside the discount window
 * the end is a known instant, and there is no point waking up after it.
 */
export function msUntilNextChange(state: PromoState): number {
  if (state.phase !== "discount") return DISCOUNT_WINDOW_MS;
  return state.msRemaining;
}
