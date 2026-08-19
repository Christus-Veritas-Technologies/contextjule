import type { PromoState } from "@contextjule/core/promo";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";

import { requireAdmin } from "../lib/admin";
import { badRequest } from "../lib/http";
import { currentPromo, updatePromo } from "../services/promo";

/**
 * The launch sequence, live.
 *
 * `GET /api/promo` is the answer; `GET /api/promo/stream` is the same answer
 * pushed when it changes. The stream exists because the number in the button is
 * the entire urgency mechanic — a counter that only moves on reload is a
 * counter nobody believes.
 *
 * One poller, not one per connection. A naive implementation opens a database
 * query per subscriber per tick, which turns a busy launch day into a
 * self-inflicted load test at the exact moment it must not be.
 */
export const promoRoutes = new Hono();

/** How often the shared poller checks the row. */
const POLL_MS = 2_000;

/**
 * How often a quiet stream sends something anyway.
 *
 * Proxies and load balancers close a connection that has been silent for a
 * minute or so, and a browser reconnecting every minute is worse than a comment
 * line every twenty seconds.
 */
const HEARTBEAT_MS = 20_000;

type Listener = (state: PromoState) => void;

const listeners = new Set<Listener>();
let poller: ReturnType<typeof setInterval> | null = null;
let lastSerialised = "";

function startPolling(): void {
  if (poller) return;
  poller = setInterval(async () => {
    try {
      const state = await currentPromo();
      const serialised = JSON.stringify(state);
      // The countdown's `msRemaining` changes on every tick, so comparing the
      // whole object would push a frame every two seconds forever. The browser
      // runs its own clock between updates; only a change of substance is worth
      // a frame.
      if (signature(state) === lastSerialised) return;
      lastSerialised = signature(state);
      for (const listener of listeners) listener(state);
    } catch (error) {
      console.error("[promo] poll failed", error);
    }
  }, POLL_MS);
  // Never hold the process open for this.
  poller.unref?.();
}

function stopPolling(): void {
  if (listeners.size > 0 || !poller) return;
  clearInterval(poller);
  poller = null;
  lastSerialised = "";
}

/** Everything except the ticking clock. */
function signature(state: PromoState): string {
  return `${state.phase}:${state.freeClaimed}:${state.freeLimit}:${state.endsAt ?? ""}`;
}

promoRoutes.get("/", async (c) => {
  const state = await currentPromo();
  // No caching. A CDN holding this for even a minute would show a stale count
  // on the one page where the count is the product.
  c.header("cache-control", "no-store");
  return c.json(state);
});

/**
 * Move the counter.
 *
 * Exists because the database is only reachable from inside the deployment —
 * the CLI in `packages/db` cannot touch production from a laptop, and opening
 * Postgres to the internet to change one integer would be a bad trade. Same
 * operations as the CLI, behind the admin token.
 *
 *   { "freeLimit": 1, "reset": true }   one copy, counter back to zero
 *   { "close": true }                   end the giveaway now, start the 72h
 *   { "active": false }                 list price, immediately
 */
const updateSchema = z
  .object({
    freeLimit: z.number().int().min(0).max(1_000_000).optional(),
    freeClaimed: z.number().int().min(0).max(1_000_000).optional(),
    discountHours: z.number().int().min(1).max(24 * 365).optional(),
    active: z.boolean().optional(),
    reset: z.boolean().optional(),
    close: z.boolean().optional(),
  })
  // An empty body would silently do nothing and report success, which reads as
  // "it worked" when nothing happened.
  .refine((body) => Object.keys(body).length > 0, {
    message: "Send at least one field to change.",
  });

promoRoutes.post("/", requireAdmin, async (c) => {
  const parsed = updateSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    throw badRequest("invalid_body", parsed.error.issues[0]?.message ?? "Nothing to change.");
  }

  const before = await currentPromo();
  const after = await updatePromo(parsed.data);

  // Logged because this is the one endpoint that changes what visitors are
  // charged, and it leaves no other trace.
  console.warn(
    `[promo] admin update ${JSON.stringify(parsed.data)} — ` +
      `${before.phase} ${before.freeClaimed}/${before.freeLimit} -> ` +
      `${after.phase} ${after.freeClaimed}/${after.freeLimit}`,
  );

  c.header("cache-control", "no-store");
  return c.json(after);
});

promoRoutes.get("/stream", async (c) => {
  c.header("cache-control", "no-store");
  c.header("x-accel-buffering", "no");

  return streamSSE(c, async (stream) => {
    let closed = false;
    const send = async (state: PromoState) => {
      if (closed) return;
      await stream.writeSSE({ event: "promo", data: JSON.stringify(state) });
    };

    const listener: Listener = (state) => {
      void send(state);
    };

    listeners.add(listener);
    startPolling();

    stream.onAbort(() => {
      closed = true;
      listeners.delete(listener);
      stopPolling();
    });

    // The current state immediately, so a subscriber never waits a poll for its
    // first frame.
    await send(await currentPromo());

    while (!closed) {
      await stream.sleep(HEARTBEAT_MS);
      if (closed) break;
      // A comment frame, not a data frame: it keeps the socket warm without the
      // client having to distinguish a keepalive from an update.
      await stream.writeSSE({ event: "ping", data: "" });
    }
  });
});
