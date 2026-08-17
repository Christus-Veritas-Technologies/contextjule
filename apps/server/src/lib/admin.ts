import { env } from "@contextjule/env/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Context, Next } from "hono";

import { ApiError } from "./http";

/**
 * The one authenticated surface.
 *
 * Publishing a release is the only thing this API does that is not either
 * public or authorised by a Dodo webhook signature. It is called by CI, so a
 * bearer token is the right weight — there is no human to log in.
 *
 * Compared in constant time. A token check that returns early on the first
 * wrong byte leaks its length and prefix to anyone patient enough to measure.
 */
export async function requireAdmin(c: Context, next: Next) {
  const header = c.req.header("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!env.ADMIN_TOKEN) {
    throw new ApiError(503, "admin_disabled", "No admin token is configured.");
  }
  if (!safeEqual(presented, env.ADMIN_TOKEN)) {
    throw new ApiError(401, "unauthorized", "Not a valid admin token.");
  }

  await next();
}

/**
 * Constant-time compare of two strings of any length.
 *
 * `timingSafeEqual` throws on a length mismatch, which would itself leak the
 * length — so both sides are hashed to a fixed width first.
 */
function safeEqual(a: string, b: string): boolean {
  const digest = (value: string) => createHmac("sha256", "compare").update(value).digest();
  return timingSafeEqual(digest(a), digest(b));
}
