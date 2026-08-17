import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  client: {
    NEXT_PUBLIC_SERVER_URL: z.url(),
    /** Shown struck through beside the launch price. Minor units. */
    NEXT_PUBLIC_FULL_PRICE: z.coerce.number().int().default(999),
    NEXT_PUBLIC_LAUNCH_PRICE: z.coerce.number().int().default(499),
    /** Static copy under the CTA. Hard-coded on purpose — not a live countdown. */
    NEXT_PUBLIC_LAUNCH_ENDS: z.string().optional(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL,
    NEXT_PUBLIC_FULL_PRICE: process.env.NEXT_PUBLIC_FULL_PRICE,
    NEXT_PUBLIC_LAUNCH_PRICE: process.env.NEXT_PUBLIC_LAUNCH_PRICE,
    NEXT_PUBLIC_LAUNCH_ENDS: process.env.NEXT_PUBLIC_LAUNCH_ENDS,
  },
  emptyStringAsUndefined: true,
});
