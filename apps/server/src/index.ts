import prisma from "@contextjule/db";
import { env } from "@contextjule/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { ApiError, clientIp } from "./lib/http";
import { RateLimiter, rateLimit } from "./lib/rate-limit";
import { checkoutRoutes } from "./routes/checkout";
import { downloadRoutes } from "./routes/downloads";
import { licenseRoutes } from "./routes/licenses";
import { promoRoutes } from "./routes/promo";
import { releaseRoutes } from "./routes/releases";
import { webhookRoutes } from "./routes/webhooks";

const app = new Hono();

app.use(logger());

/**
 * CORS covers the marketing site only. The desktop app is not a browser origin
 * and sends no Origin header, so it is unaffected — and the license endpoints
 * it calls are Dodo's public ones anyway.
 */
app.use(
  "/api/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
    // `authorization` is here for the release endpoint, which CI calls. CI is
    // not a browser and never sends an Origin, but a stricter list would make
    // the same request fail confusingly from a terminal on a laptop.
    allowHeaders: ["content-type", "authorization"],
  }),
);

/**
 * Rate limits.
 *
 * Three buckets, sized by what a burst actually costs us:
 *
 *   checkout   Dodo session creation, and the free promotion's usage cap.
 *   licensing  an upstream call per request, on a public endpoint.
 *   downloads  a token redemption and an email send.
 *
 * None of these is an authorisation boundary — see `lib/rate-limit.ts`. They
 * exist so one loop cannot spend a ceiling that belongs to everyone.
 */
const MINUTE = 60_000;
const checkoutLimiter = new RateLimiter(10, MINUTE);
const licenseLimiter = new RateLimiter(30, MINUTE);
const downloadLimiter = new RateLimiter(20, MINUTE);
/**
 * Generous, because an SSE connection that drops reconnects on its own every
 * few seconds and a visitor watching the counter is doing nothing wrong. The
 * shared poller means the database cost here is flat regardless of how many
 * browsers are subscribed.
 */
const promoLimiter = new RateLimiter(90, MINUTE);

app.use("/api/checkout/*", rateLimit(checkoutLimiter, clientIp));
app.use("/api/licenses/*", rateLimit(licenseLimiter, clientIp));
app.use("/api/downloads/*", rateLimit(downloadLimiter, clientIp));
app.use("/api/promo/*", rateLimit(promoLimiter, clientIp));

app.get("/", (c) => c.text("OK"));

/**
 * Health.
 *
 * Touches the database on purpose. A health check that only proves the process
 * is running will happily report green while every route 500s, which is exactly
 * the failure a deploy needs to catch. `?deep=0` skips it for a load balancer
 * that polls often enough for the query to matter.
 */
app.get("/health", async (c) => {
  const deep = c.req.query("deep") !== "0";
  let database: "ok" | "unreachable" | "skipped" = "skipped";

  if (deep) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      database = "ok";
    } catch (error) {
      console.error("[health] database unreachable", error);
      database = "unreachable";
    }
  }

  const ok = database !== "unreachable";
  return c.json(
    {
      ok,
      database,
      environment: env.DODO_ENVIRONMENT,
      time: new Date().toISOString(),
    },
    ok ? 200 : 503,
  );
});

app.route("/api/checkout", checkoutRoutes);
app.route("/api/promo", promoRoutes);
app.route("/api/licenses", licenseRoutes);
app.route("/api/downloads", downloadRoutes);
app.route("/api/releases", releaseRoutes);
// Webhooks sit outside /api/* so the CORS middleware never touches them; the
// signature is the only thing that authorises this route, and a rate limit here
// would drop deliveries Dodo would then retry forever.
app.route("/webhooks", webhookRoutes);

app.onError((error, c) => {
  if (error instanceof ApiError) {
    return c.json({ error: error.code, message: error.message }, error.status);
  }
  console.error("[unhandled]", error);
  return c.json({ error: "internal_error", message: "Something went wrong on our side." }, 500);
});

app.notFound((c) => c.json({ error: "not_found" }, 404));

export default app;
