import { env } from "@contextjule/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { ApiError } from "./lib/http";
import { checkoutRoutes } from "./routes/checkout";
import { downloadRoutes } from "./routes/downloads";
import { licenseRoutes } from "./routes/licenses";
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
    allowHeaders: ["content-type"],
  }),
);

app.get("/", (c) => c.text("OK"));
app.get("/health", (c) =>
  c.json({ ok: true, environment: env.DODO_ENVIRONMENT, time: new Date().toISOString() }),
);

app.route("/api/checkout", checkoutRoutes);
app.route("/api/licenses", licenseRoutes);
app.route("/api/downloads", downloadRoutes);
// Webhooks sit outside /api/* so the CORS middleware never touches them; the
// signature is the only thing that authorises this route.
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
