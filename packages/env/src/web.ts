import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * The site's environment.
 *
 * Deliberately one variable.
 *
 * Prices used to live here — a full price, a launch price and a hard-coded
 * "launch ends" string. They are gone. The launch sequence is now a phase the
 * server owns and pushes live (`GET /api/promo`), and the list price lives in
 * `@contextjule/core/pricing` where the desktop app and the backend read the
 * same number. A price baked into the site's build is a price that disagrees
 * with the checkout the moment either one changes, and the customer is the one
 * who finds out.
 */
export const env = createEnv({
  client: {
    /** Origin of the API. Everything else the site needs comes from it. */
    NEXT_PUBLIC_SERVER_URL: z.url(),

    /**
     * Google Analytics measurement id, `G-…`.
     *
     * Optional, and that is the point: unset, no tag is rendered at all. Local
     * development and preview builds would otherwise pollute the same property
     * the real numbers live in, and "why did conversion drop" is hard enough
     * without your own clicking in the data.
     */
    NEXT_PUBLIC_GA_ID: z
      .string()
      .regex(/^G-[A-Z0-9]+$/, "Should look like G-XXXXXXXXXX")
      .optional(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL,
    NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
  },
  emptyStringAsUndefined: true,
});
