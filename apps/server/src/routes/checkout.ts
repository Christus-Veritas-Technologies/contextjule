import { formatPrice } from "@contextjule/core/format";
import { OFFER_SPECS } from "@contextjule/core/pricing";
import prisma from "@contextjule/db";
import { env } from "@contextjule/env/server";
import { Hono } from "hono";
import { z } from "zod";

import { dodo } from "../lib/dodo";
import { ApiError, badRequest, clientIp, notFound, tooMany } from "../lib/http";
import { currentPromo } from "../services/promo";

/**
 * Checkout.
 *
 * There are no discount codes anywhere in this flow, deliberately. Several of
 * the places this gets posted do not allow promo codes at all, and a code is a
 * second thing that can be wrong: it can expire, be capped, be copied into a
 * thread, or silently not apply. Instead there is one product whose price is
 * edited by hand as the launch moves — free, then $4.99, then $14.99 — and the
 * site simply shows what phase we are in.
 *
 * That makes the price Dodo charges the single source of truth. Our `Promo` row
 * decides what the page *says*; the Dodo product decides what is *charged*; and
 * the webhook labels the payment from the amount that actually cleared. If the
 * two ever disagree, the customer's invoice is right and our label is wrong,
 * which is the correct way round for that mistake to happen.
 */
const bodySchema = z.object({
  /** What the page believed the offer was when the button was rendered. */
  expectedOffer: z.enum(["full", "launch", "free"]).optional(),
  email: z.email().optional(),
  name: z.string().trim().max(120).optional(),
});

export const checkoutRoutes = new Hono();

checkoutRoutes.post("/", async (c) => {
  const parsed = bodySchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) throw badRequest("invalid_body", "Check the email address and try again.");

  const { expectedOffer, email, name } = parsed.data;

  const promo = await currentPromo();
  const offer = promo.offer;

  // The page was rendered before the phase moved. Say so rather than sending
  // someone to a checkout whose price is not the one they were shown — that is
  // the difference between a race and a bait and switch.
  if (expectedOffer && expectedOffer !== offer) {
    throw new ApiError(
      409,
      "offer_moved",
      offer === "free"
        ? "Good news — it is free again right now. Refresh and grab it."
        : `That offer just ended. It is ${formatPrice(promo.amount)} now — refresh to see it.`,
    );
  }

  // One copy per address.
  //
  // With no discount code there is no `first_time` eligibility rule doing this
  // for us, so it is entirely ours to enforce. It is a kindness as much as a
  // guard: the common reason somebody buys twice is that they lost the first
  // email, and the answer to that is the resend link, not another charge.
  if (email) {
    const existing = await prisma.customer.findUnique({
      where: { email: email.toLowerCase() },
      select: { licenseKeys: { where: { status: "active" }, select: { id: true }, take: 1 } },
    });
    if (existing && existing.licenseKeys.length > 0) {
      throw new ApiError(
        409,
        "already_owned",
        "You already have a copy on this address. Ask for your download link again below.",
      );
    }
  }

  // A free claim is the only route worth counting in the database — the
  // in-memory limiter in `index.ts` stops a burst, and this stops a slow drip
  // over a day. The hundred-copy cap on the Promo row is the real ceiling;
  // both of these exist so one person cannot spend it.
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
    return_url: `${env.WEB_URL}/thanks`,
    // Only ever used to label the row if the amount is one we do not recognise.
    metadata: { offer },
  });

  await prisma.checkout.create({
    data: {
      dodoSessionId: session.session_id,
      offer,
      email: email?.toLowerCase() ?? null,
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
    amount: promo.amount,
  });
});

/**
 * What the site should render.
 *
 * Exactly one offer is `current` — the phase decides it, and it is the only one
 * a checkout will actually use. The others are listed so the page can show what
 * the price was and what it is going back to.
 */
checkoutRoutes.get("/offers", async (c) => {
  const promo = await currentPromo();

  c.header("cache-control", "no-store");
  return c.json({
    promo,
    offers: Object.values(OFFER_SPECS).map((spec) => ({
      id: spec.id,
      label: spec.label,
      amount: spec.amount,
      currency: "USD",
      current: spec.id === promo.offer,
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

  c.header("cache-control", "no-store");
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
