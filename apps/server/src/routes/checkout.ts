import { OFFER_SPECS, type Offer } from "@contextjule/core/pricing";
import prisma from "@contextjule/db";
import { env } from "@contextjule/env/server";
import { Hono } from "hono";
import { z } from "zod";

import { dodo } from "../lib/dodo";
import { badRequest, clientIp, tooMany } from "../lib/http";

/**
 * Checkout.
 *
 * There is one product and three ways to reach it, and they are all the same
 * request with a different discount code attached:
 *
 *   full    no code
 *   launch  a capped percentage code — the struck-through price on the site
 *   free    a 100% code with a usage limit set in the Dodo dashboard
 *
 * That last one is the answer to "how do I limit a free promotion without
 * building a second, weaker delivery path". The cap lives on the code, Dodo
 * enforces it, and a free claim still produces a customer, a payment row of
 * zero and — crucially — a real license key. So the app's unlock check never
 * has to know whether someone paid.
 */
const bodySchema = z.object({
  offer: z.enum(["full", "launch", "free"]).default("full"),
  email: z.email().optional(),
  name: z.string().trim().max(120).optional(),
});

export const checkoutRoutes = new Hono();

checkoutRoutes.post("/", async (c) => {
  const parsed = bodySchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) throw badRequest("invalid_body", "Check the email address and try again.");

  const { offer, email, name } = parsed.data;
  const discountCode = discountFor(offer);

  if (offer !== "full" && !discountCode) {
    throw badRequest("offer_unavailable", "That offer is not running right now.");
  }

  // A free claim is the only route worth rate limiting here — Dodo's own usage
  // cap is the real ceiling, this just keeps one script from eating it in a
  // minute and denying everyone else.
  if (offer === "free") {
    const ip = clientIp(c);
    if (ip) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recent = await prisma.checkout.count({
        where: { ip, offer: "free", createdAt: { gte: since } },
      });
      if (recent >= env.FREE_CLAIM_IP_LIMIT) {
        throw tooMany("claim_limit", "That is a few too many claims from here today.");
      }
    }
  }

  const session = await dodo.checkoutSessions.create({
    product_cart: [{ product_id: env.DODO_PRODUCT_ID, quantity: 1 }],
    ...(email ? { customer: { email, ...(name ? { name } : {}) } } : {}),
    ...(discountCode ? { discount_code: discountCode } : {}),
    return_url: `${env.WEB_URL}/thanks`,
    metadata: { offer },
  });

  const discount = discountCode
    ? await prisma.discount.findUnique({ where: { code: discountCode } })
    : null;

  await prisma.checkout.create({
    data: {
      dodoSessionId: session.session_id,
      offer,
      email: email?.toLowerCase() ?? null,
      discountId: discount?.id ?? null,
      discountCode: discountCode ?? null,
      checkoutUrl: session.checkout_url,
      ip: clientIp(c) ?? null,
      userAgent: c.req.header("user-agent") ?? null,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  return c.json({
    checkoutUrl: session.checkout_url,
    sessionId: session.session_id,
    offer,
    amount: OFFER_SPECS[offer].amount,
  });
});

/** What the site should render: which offers are live, and at what price. */
checkoutRoutes.get("/offers", (c) => {
  return c.json({
    offers: (Object.keys(OFFER_SPECS) as Offer[])
      .filter((offer) => offer === "full" || Boolean(discountFor(offer)))
      .map((offer) => ({
        id: offer,
        label: OFFER_SPECS[offer].label,
        amount: OFFER_SPECS[offer].amount,
        currency: "USD",
      })),
  });
});

function discountFor(offer: Offer): string | undefined {
  if (offer === "launch") return env.DODO_LAUNCH_DISCOUNT_CODE;
  if (offer === "free") return env.DODO_FREE_DISCOUNT_CODE;
  return undefined;
}
