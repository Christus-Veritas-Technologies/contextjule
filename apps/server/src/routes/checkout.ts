import { OFFER_SPECS, type Offer } from "@contextjule/core/pricing";
import prisma from "@contextjule/db";
import { env } from "@contextjule/env/server";
import { Hono } from "hono";
import { z } from "zod";

import { dodo } from "../lib/dodo";
import { badRequest, clientIp, notFound, tooMany } from "../lib/http";

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

  // A free claim is the only route worth counting in the database — the
  // in-memory limiter in `index.ts` stops a burst, and this stops a slow drip
  // over a day. Dodo's own usage cap on the code is the real ceiling; both of
  // these exist so one person cannot spend it.
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

/**
 * What the site should render: which offers are live, and at what price.
 *
 * `soldOut` is the one that matters for the free promotion. The cap is enforced
 * by Dodo, but the site needs to know before it renders a button that would
 * fail — so the mirrored Discount row is read here, and a code past its usage
 * limit or its end date is reported as exhausted rather than offered.
 */
checkoutRoutes.get("/offers", async (c) => {
  const codes = (Object.keys(OFFER_SPECS) as Offer[])
    .map((offer) => ({ offer, code: discountFor(offer) }))
    .filter((entry): entry is { offer: Offer; code: string } => Boolean(entry.code));

  const discounts = codes.length
    ? await prisma.discount.findMany({ where: { code: { in: codes.map((entry) => entry.code) } } })
    : [];

  const now = new Date();
  const byCode = new Map(discounts.map((discount) => [discount.code, discount]));

  const offers = (Object.keys(OFFER_SPECS) as Offer[])
    .map((offer) => {
      const code = discountFor(offer);
      // The full price is always available: it needs no code to exist.
      if (offer === "full") {
        return { offer, available: true, soldOut: false, remaining: null as number | null };
      }
      if (!code) return null;

      const discount = byCode.get(code);
      // A code we have not mirrored yet is assumed live. Dodo is the authority
      // and will reject it at checkout if it is not — better than hiding an
      // offer the moment the seed has not been run.
      if (!discount) {
        return { offer, available: true, soldOut: false, remaining: null as number | null };
      }

      const expired = Boolean(discount.expiresAt && discount.expiresAt < now);
      const notStarted = Boolean(discount.startsAt && discount.startsAt > now);
      const remaining =
        discount.usageLimit === null ? null : Math.max(0, discount.usageLimit - discount.timesUsed);
      const soldOut = remaining !== null && remaining === 0;

      return {
        offer,
        available: discount.active && !expired && !notStarted && !soldOut,
        soldOut,
        remaining,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  return c.json({
    offers: offers.map((entry) => ({
      id: entry.offer,
      label: OFFER_SPECS[entry.offer].label,
      amount: OFFER_SPECS[entry.offer].amount,
      currency: "USD",
      available: entry.available,
      soldOut: entry.soldOut,
      remaining: entry.remaining,
    })),
  });
});

/**
 * What happened to a checkout.
 *
 * The thanks page needs this. Dodo redirects back the moment the card clears,
 * which is usually before the webhook lands, so the page has to be able to poll
 * for "your key is ready" instead of showing a blank or, worse, claiming
 * failure. The session id is a high-entropy value the buyer's own browser
 * received from `POST /api/checkout`, and the key is only returned once a
 * succeeded payment is attached to it.
 */
checkoutRoutes.get("/:sessionId", async (c) => {
  const sessionId = c.req.param("sessionId");
  const checkout = await prisma.checkout.findUnique({
    where: { dodoSessionId: sessionId },
    include: {
      payment: { include: { licenseKeys: { orderBy: { createdAt: "desc" }, take: 1 } } },
      customer: { include: { licenseKeys: { orderBy: { createdAt: "desc" }, take: 1 } } },
    },
  });

  if (!checkout) throw notFound("unknown_session", "We have no record of that checkout.");

  const payment = checkout.payment;
  const paid = payment?.status === "succeeded";
  // Prefer the key attached to this payment; fall back to the customer's newest
  // one, because the two webhooks race and the link is written by whichever
  // arrives second.
  const key = paid ? (payment.licenseKeys[0] ?? checkout.customer?.licenseKeys[0] ?? null) : null;

  return c.json({
    sessionId,
    status: checkout.status,
    offer: checkout.offer,
    paid,
    // Null while the webhook is still in flight. The page should poll, not
    // conclude anything from this being absent.
    licenseKey: key?.key ?? null,
    email: checkout.email ?? checkout.customer?.email ?? null,
    amountMinor: payment?.totalMinor ?? null,
    currency: payment?.currency ?? "USD",
    completedAt: checkout.completedAt,
  });
});

function discountFor(offer: Offer): string | undefined {
  if (offer === "launch") return env.DODO_LAUNCH_DISCOUNT_CODE;
  if (offer === "free") return env.DODO_FREE_DISCOUNT_CODE;
  return undefined;
}
