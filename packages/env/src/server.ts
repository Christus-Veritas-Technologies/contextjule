import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/**
 * Server environment.
 *
 * Dodo Payments is the only payment processor and the only issuer of license
 * keys. The discount codes below are how offers work: the free promotion is a
 * 100% code with a usage cap on the same product, not a separate SKU, so paid
 * and free claims share one code path and one delivery path.
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
    /** The one product. `pdt_…`. */
    DODO_PRODUCT_ID: z.string().min(1),
    /** Capped percentage code behind the struck-through launch price. */
    DODO_LAUNCH_DISCOUNT_CODE: z.string().optional(),
    /** 100% code with a usage limit. Absent means the free promotion is off. */
    DODO_FREE_DISCOUNT_CODE: z.string().optional(),

    // --- Transactional email ------------------------------------------------
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().default("ContextJule <hello@contextjule.com>"),
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
  },
  runtimeEnv: process.env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
