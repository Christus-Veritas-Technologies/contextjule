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
  },
  runtimeEnv: {
    NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL,
  },
  emptyStringAsUndefined: true,
});
