import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/**
 * Server environment.
 *
 * Dodo Payments is the only payment processor and the only issuer of licence
 * keys. There are no discount codes: several of the places this gets posted do
 * not allow promo codes, and a code is a second thing that can be wrong. The
 * one product's price is edited by hand as the launch moves through its phases
 * — free, then $4.99, then $14.99 — and the `Promo` row is what decides which
 * phase the site is showing.
 */
export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    CORS_ORIGIN: z.url(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

    /** Public origin of this API, used to build download links in emails. */
    SERVER_URL: z.url().default("http://localhost:3000"),
    /** Public origin of the marketing site, used for checkout return URLs. */
    WEB_URL: z.url().default("http://localhost:3001"),

    // --- Dodo Payments ------------------------------------------------------
    DODO_API_KEY: z.string().min(1),
    /** Signing secret for inbound webhooks. Standard Webhooks scheme. */
    DODO_WEBHOOK_KEY: z.string().min(1),
    DODO_ENVIRONMENT: z.enum(["test_mode", "live_mode"]).default("test_mode"),
    /** The one product. `pdt_…`. Its price is the price. */
    DODO_PRODUCT_ID: z.string().min(1),

    // --- Transactional email over SMTP --------------------------------------
    /**
     * Plain SMTP through nodemailer rather than a provider SDK. The purchase
     * email is the most important thing this backend sends, and SMTP means it
     * can move between providers by editing these five values instead of by a
     * deploy.
     */
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    /**
     * Implicit TLS. Left unset it is derived from the port (465 is implicit,
     * everything else is STARTTLS), which is right almost everywhere — set it
     * only for a provider that disagrees.
     */
    SMTP_SECURE: z
      .string()
      .optional()
      .transform((value) => (value === undefined ? undefined : value === "true")),

    EMAIL_FROM: z.string().default("ContextJule <hello@contextjule.com>"),
    /** Where a reply should land, if that is not the From address. */
    EMAIL_REPLY_TO: z.string().optional(),
    /** Skip sending and log the payload instead. On by default in development. */
    EMAIL_DRY_RUN: z
      .string()
      .optional()
      .transform((value) => value === "true"),

    // --- Gated downloads ----------------------------------------------------
    /**
     * HMAC secret for download tokens and signed artifact URLs. Rotating it
     * invalidates every outstanding link, which is the intended emergency stop.
     */
    DOWNLOAD_SIGNING_SECRET: z.string().min(32),
    /**
     * Where installers actually live. If set, signed URLs point here; otherwise
     * this server streams them itself.
     */
    ARTIFACT_BASE_URL: z.url().optional(),

    /** Free claims allowed from one IP per day. Blunt, and enough. */
    FREE_CLAIM_IP_LIMIT: z.coerce.number().int().positive().default(3),

    // --- publishing ---------------------------------------------------------
    /**
     * Bearer token for `POST /api/releases`, called by the release workflow.
     *
     * The only authenticated surface in the API — everything else is either
     * public or authorised by a Dodo webhook signature. Optional so a local
     * dev server boots without one; the endpoint returns 503 rather than
     * defaulting to something guessable when it is unset.
     */
    ADMIN_TOKEN: z.string().min(32).optional(),
  },
  runtimeEnv: process.env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
