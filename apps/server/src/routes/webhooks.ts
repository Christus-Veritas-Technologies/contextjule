import prisma from "@contextjule/db";
import { env } from "@contextjule/env/server";
import { Hono } from "hono";

import { dodo } from "../lib/dodo";
import {
  customerFrom,
  type DodoEvent,
  grantStatusFor,
  isHandled,
  licenseKeyFrom,
  paymentFrom,
  refundTargetFrom,
  resolveOffer,
  revokedKeyFrom,
} from "../lib/dodo-payload";
import {
  deliverPurchase,
  recordLicenseKey,
  recordPayment,
  upsertCustomer,
} from "../services/provisioning";

/**
 * Dodo webhooks.
 *
 * Four properties this handler has to hold, in order of how much they hurt when
 * they are missing:
 *
 *   1. Signature verified before anything is read. The body is parsed by the
 *      SDK's `unwrap`, never by us, so an unsigned payload cannot reach a query.
 *   2. Idempotent. Delivery is at-least-once; a duplicate `webhook-id` is
 *      dropped on a unique index rather than issuing a second license key.
 *   3. Order-independent. `payment.succeeded` and `entitlement_grant.delivered`
 *      race constantly, so either one arriving second is what sends the email
 *      and neither sends it twice.
 *   4. Fails loudly. A 500 asks Dodo to retry — which is what we want when the
 *      database is briefly down — but a payload we simply do not handle is a
 *      200, so it is not retried forever.
 *
 * The reading of each payload lives in `lib/dodo-payload.ts`, which has no
 * imports and is therefore actually testable. This file is the part that talks
 * to the database.
 */
export const webhookRoutes = new Hono();

webhookRoutes.post("/dodo", async (c) => {
  const raw = await c.req.text();

  const webhookId = c.req.header("webhook-id") ?? "";
  if (!webhookId) return c.json({ error: "missing_webhook_id" }, 400);

  let event: DodoEvent;
  try {
    event = dodo.webhooks.unwrap(raw, {
      headers: {
        "webhook-id": webhookId,
        "webhook-signature": c.req.header("webhook-signature") ?? "",
        "webhook-timestamp": c.req.header("webhook-timestamp") ?? "",
      },
    }) as DodoEvent;
  } catch {
    // Deliberately no detail. An attacker probing the signature scheme learns
    // nothing from this response that they did not already know.
    return c.json({ error: "invalid_signature" }, 401);
  }

  // Claim the delivery. A duplicate loses the race on the unique index and
  // returns 200 without doing the work again.
  try {
    await prisma.webhookEvent.create({
      data: {
        webhookId,
        type: event.type,
        payloadType: typeof event.data?.payload_type === "string" ? event.data.payload_type : null,
        raw: event as never,
      },
    });
  } catch {
    return c.json({ received: true, duplicate: true });
  }

  try {
    const handled = await handle(event);
    await prisma.webhookEvent.update({
      where: { webhookId },
      data: { status: handled ? "processed" : "ignored", processedAt: new Date() },
    });
    return c.json({ received: true });
  } catch (error) {
    await prisma.webhookEvent.update({
      where: { webhookId },
      data: {
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        attempts: { increment: 1 },
      },
    });
    // 500 so Dodo retries. The idempotency row is left behind on purpose: the
    // retry carries the same webhook-id and would be dropped, so a failed event
    // is replayed from the dashboard once the cause is fixed.
    console.error(`[webhook] ${event.type} failed`, error);
    return c.json({ error: "handler_failed" }, 500);
  }
});

async function handle(event: DodoEvent): Promise<boolean> {
  if (!isHandled(event.type)) return false;

  switch (event.type) {
    case "payment.succeeded":
    case "payment.failed":
      return handlePayment(event, event.type === "payment.succeeded");

    case "payment.refunded":
    case "refund.succeeded":
      return handleReversal(event, "refunded");

    // A dispute is a refund we did not choose. Same consequence for the key:
    // it stops validating, and the app falls back to its offline grace before
    // locking, so nobody is cut off mid-sentence.
    case "dispute.opened":
    case "dispute.accepted":
      return handleReversal(event, "disputed");

    case "license_key.created":
    case "entitlement_grant.created":
    case "entitlement_grant.delivered":
      return handleLicenseKey(event);

    case "license_key.revoked":
    case "entitlement_grant.revoked":
      return handleRevocation(event);

    default:
      return false;
  }
}

async function handlePayment(event: DodoEvent, succeeded: boolean): Promise<boolean> {
  const who = customerFrom(event);
  const fields = paymentFrom(event);
  if (!who || !fields) return false;

  const customer = await upsertCustomer(who);

  // Checked before the upsert so a manual replay of an old event cannot
  // increment the discount counter a second time. The counter drives whether
  // the site still shows the free offer, so drift there hides a live promotion
  // or keeps a spent one on screen.
  const firstTime = !(await prisma.payment.findUnique({
    where: { dodoPaymentId: fields.dodoPaymentId },
    select: { id: true },
  }));

  const payment = await recordPayment({
    dodoPaymentId: fields.dodoPaymentId,
    customerId: customer.id,
    status: succeeded ? "succeeded" : "failed",
    offer: resolveOffer({
      totalMinor: fields.totalMinor,
      discountCode: fields.discountCode,
      declaredOffer: fields.declaredOffer,
      launchCode: env.DODO_LAUNCH_DISCOUNT_CODE ?? null,
      freeCode: env.DODO_FREE_DISCOUNT_CODE ?? null,
    }),
    totalMinor: fields.totalMinor,
    subtotalMinor: fields.subtotalMinor,
    currency: fields.currency,
    discountCode: fields.discountCode,
    paymentMethod: fields.paymentMethod,
    raw: event,
  });

  // Close the loop on the checkout row we wrote before the redirect. Without
  // this every checkout stays `created` forever and the thanks page has no way
  // to tell a completed purchase from an abandoned one.
  await linkCheckout({
    sessionId: fields.checkoutSessionId,
    email: customer.email,
    customerId: customer.id,
    paymentId: payment.id,
    completed: succeeded,
  });

  if (!succeeded) return true;

  // Mirror the redemption onto our own Discount row. Dodo enforces the real cap
  // — this is only so `GET /api/checkout/offers` can stop showing an offer that
  // is about to start failing at the till.
  if (firstTime && fields.discountCode) {
    await prisma.discount.updateMany({
      where: { code: fields.discountCode },
      data: { timesUsed: { increment: 1 } },
    });
  }

  // The key may already be here (grant delivered first) or may not be (payment
  // first). Either order ends with exactly one email, because whichever handler
  // finds both halves sends it and `deliverPurchase` is guarded on the log.
  const key = await prisma.licenseKey.findFirst({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
  });

  if (key) {
    await prisma.licenseKey.update({ where: { id: key.id }, data: { paymentId: payment.id } });
    await deliverPurchase({
      email: customer.email,
      customerId: customer.id,
      licenseKeyId: key.id,
      licenseKey: key.key,
      free: payment.totalMinor === 0,
    });
  }
  return true;
}

async function handleReversal(event: DodoEvent, kind: "refunded" | "disputed"): Promise<boolean> {
  const paymentId = refundTargetFrom(event);
  if (!paymentId) return false;

  const payment = await prisma.payment.findUnique({ where: { dodoPaymentId: paymentId } });
  // A reversal for a payment we never recorded is not an error — it is a
  // payment whose `succeeded` webhook has not landed yet, or one from before
  // this system existed. Acknowledge it rather than looping on a 500.
  if (!payment) return false;

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: kind,
      refundedAt: kind === "refunded" ? new Date() : payment.refundedAt,
    },
  });

  // A reversed key stops validating, which is what the desktop app's seven-day
  // offline grace is sized against.
  await prisma.licenseKey.updateMany({
    where: { paymentId: payment.id },
    data: { status: "revoked" },
  });
  return true;
}

async function handleLicenseKey(event: DodoEvent): Promise<boolean> {
  const who = customerFrom(event);
  const fields = licenseKeyFrom(event);
  if (!who || !fields) return false;

  const customer = await upsertCustomer(who);

  const stored = await recordLicenseKey({
    key: fields.key,
    dodoLicenseKeyId: fields.dodoLicenseKeyId,
    customerId: customer.id,
    activationsLimit: fields.activationsLimit,
    activationsUsed: fields.activationsUsed,
    expiresAt: fields.expiresAt,
  });

  const grantStatus = grantStatusFor(event.type);
  if (fields.grantId && grantStatus) {
    const delivered = grantStatus === "delivered";
    await prisma.entitlementGrant.upsert({
      where: { dodoGrantId: fields.grantId },
      create: {
        dodoGrantId: fields.grantId,
        status: grantStatus,
        customerId: customer.id,
        licenseKeyId: stored.id,
        deliveredAt: delivered ? new Date() : null,
        raw: event as never,
      },
      // A `created` arriving after a `delivered` must not walk the status back.
      update: {
        status: delivered ? "delivered" : undefined,
        licenseKeyId: stored.id,
        deliveredAt: delivered ? new Date() : undefined,
      },
    });
  }

  const payment = await prisma.payment.findFirst({
    where: { customerId: customer.id, status: "succeeded" },
    orderBy: { createdAt: "desc" },
  });

  // Only mail once the payment is known, so a free claim is labelled correctly
  // in the subject line rather than guessed at.
  if (payment) {
    if (!stored.paymentId) {
      await prisma.licenseKey.update({
        where: { id: stored.id },
        data: { paymentId: payment.id },
      });
    }
    await deliverPurchase({
      email: customer.email,
      customerId: customer.id,
      licenseKeyId: stored.id,
      licenseKey: stored.key,
      free: payment.totalMinor === 0,
    });
  }
  return true;
}

async function handleRevocation(event: DodoEvent): Promise<boolean> {
  const key = revokedKeyFrom(event);
  if (!key) return false;

  const updated = await prisma.licenseKey.updateMany({
    where: { key },
    data: { status: "revoked" },
  });

  if (event.type === "entitlement_grant.revoked") {
    const grantId =
      typeof event.data.grant_id === "string"
        ? event.data.grant_id
        : typeof event.data.id === "string"
          ? event.data.id
          : null;
    if (grantId) {
      await prisma.entitlementGrant.updateMany({
        where: { dodoGrantId: grantId },
        data: { status: "revoked", revokedAt: new Date() },
      });
    }
  }

  return updated.count > 0;
}

/**
 * Attach a payment to the checkout that produced it.
 *
 * Dodo does not always echo the session id on the payment, so there is a
 * fallback: the most recent unfinished checkout for the same email. That is a
 * guess, and it is scoped tightly enough to be a safe one — same address, still
 * `created`, and only ever used to fill a blank, never to overwrite a link we
 * already have.
 */
async function linkCheckout(input: {
  sessionId: string | null;
  email: string;
  customerId: string;
  paymentId: string;
  completed: boolean;
}): Promise<void> {
  const checkout = input.sessionId
    ? await prisma.checkout.findUnique({ where: { dodoSessionId: input.sessionId } })
    : await prisma.checkout.findFirst({
        where: { email: input.email, status: "created", payment: null },
        orderBy: { createdAt: "desc" },
      });

  if (!checkout) return;

  await prisma.checkout.update({
    where: { id: checkout.id },
    data: {
      status: input.completed ? "completed" : checkout.status,
      completedAt: input.completed ? new Date() : checkout.completedAt,
      customerId: checkout.customerId ?? input.customerId,
    },
  });

  // The payment owns the relation (`checkoutId` is unique there), so the link
  // is written from that side. A second payment against the same session would
  // violate the unique index — which is correct, and is why this is guarded.
  const alreadyLinked = await prisma.payment.findUnique({
    where: { checkoutId: checkout.id },
    select: { id: true },
  });
  if (alreadyLinked) return;

  await prisma.payment.update({
    where: { id: input.paymentId },
    data: { checkoutId: checkout.id },
  });
}
