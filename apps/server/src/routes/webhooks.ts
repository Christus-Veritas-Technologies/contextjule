import prisma from "@contextjule/db";
import { Hono } from "hono";

import { dodo, type DodoWebhookPayload } from "../lib/dodo";
import {
  deliverPurchase,
  recordLicenseKey,
  recordPayment,
  upsertCustomer,
} from "../services/provisioning";

/**
 * Dodo webhooks.
 *
 * Three properties this handler has to hold, in order of how much they hurt
 * when they are missing:
 *
 *   1. Signature verified before anything is read. The body is parsed by the
 *      SDK's `unwrap`, never by us, so an unsigned payload cannot reach a query.
 *   2. Idempotent. Delivery is at-least-once; a duplicate `webhook-id` is
 *      dropped on a unique index rather than issuing a second license key.
 *   3. Fails loudly. A 500 asks Dodo to retry — which is what we want when the
 *      database is briefly down — but a payload we simply do not handle is a
 *      200, so it is not retried forever.
 */
export const webhookRoutes = new Hono();

webhookRoutes.post("/dodo", async (c) => {
  const raw = await c.req.text();

  let event: DodoWebhookPayload;
  try {
    event = dodo.webhooks.unwrap(raw, {
      headers: {
        "webhook-id": c.req.header("webhook-id") ?? "",
        "webhook-signature": c.req.header("webhook-signature") ?? "",
        "webhook-timestamp": c.req.header("webhook-timestamp") ?? "",
      },
    }) as DodoWebhookPayload;
  } catch {
    return c.json({ error: "invalid_signature" }, 401);
  }

  const webhookId = c.req.header("webhook-id") ?? "";
  if (!webhookId) return c.json({ error: "missing_webhook_id" }, 400);

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

async function handle(event: DodoWebhookPayload): Promise<boolean> {
  const data = event.data as Record<string, any>;

  switch (event.type) {
    case "payment.succeeded":
    case "payment.failed": {
      const email = data.customer?.email;
      if (!email) return false;

      const customer = await upsertCustomer({
        email,
        dodoCustomerId: data.customer?.customer_id ?? data.customer?.id ?? null,
        name: data.customer?.name ?? null,
        country: data.billing?.country ?? null,
      });

      const payment = await recordPayment({
        dodoPaymentId: data.payment_id ?? data.id,
        customerId: customer.id,
        status: event.type === "payment.succeeded" ? "succeeded" : "failed",
        totalMinor: Number(data.total_amount ?? data.settlement_amount ?? 0),
        subtotalMinor: data.subtotal_amount != null ? Number(data.subtotal_amount) : null,
        currency: data.currency ?? "USD",
        discountCode: data.discount_id ?? data.discount_code ?? null,
        paymentMethod: data.payment_method ?? null,
        raw: event,
      });

      if (event.type !== "payment.succeeded") return true;

      // The key may already be here (grant delivered first) or may not be
      // (payment first). Either order ends with exactly one email, because
      // whichever handler finds a key sends it and the other finds none.
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

    case "payment.refunded":
    case "refund.succeeded": {
      const paymentId = data.payment_id ?? data.payment?.payment_id;
      if (!paymentId) return false;
      const payment = await prisma.payment.update({
        where: { dodoPaymentId: paymentId },
        data: { status: "refunded", refundedAt: new Date() },
      });
      // A refunded key stops validating, which is what the desktop app's
      // seven-day offline grace is sized against.
      await prisma.licenseKey.updateMany({
        where: { paymentId: payment.id },
        data: { status: "revoked" },
      });
      return true;
    }

    case "license_key.created":
    case "entitlement_grant.created":
    case "entitlement_grant.delivered": {
      const licenseKey = data.license_key ?? data;
      const keyValue = licenseKey?.key ?? licenseKey?.license_key;
      const email = data.customer?.email ?? licenseKey?.customer?.email;
      if (!keyValue || !email) return false;

      const customer = await upsertCustomer({
        email,
        dodoCustomerId: data.customer?.customer_id ?? null,
        name: data.customer?.name ?? null,
      });

      const stored = await recordLicenseKey({
        key: keyValue,
        dodoLicenseKeyId: licenseKey?.id ?? licenseKey?.license_key_id ?? null,
        customerId: customer.id,
        activationsLimit: licenseKey?.activations_limit ?? null,
        activationsUsed: licenseKey?.instances_count ?? licenseKey?.activations_used ?? 0,
        expiresAt: licenseKey?.expires_at ? new Date(licenseKey.expires_at) : null,
      });

      if (data.grant_id ?? data.id) {
        await prisma.entitlementGrant.upsert({
          where: { dodoGrantId: String(data.grant_id ?? data.id) },
          create: {
            dodoGrantId: String(data.grant_id ?? data.id),
            status: event.type === "entitlement_grant.delivered" ? "delivered" : "pending",
            customerId: customer.id,
            licenseKeyId: stored.id,
            deliveredAt: event.type === "entitlement_grant.delivered" ? new Date() : null,
            raw: event as never,
          },
          update: {
            status: event.type === "entitlement_grant.delivered" ? "delivered" : undefined,
            licenseKeyId: stored.id,
            deliveredAt: event.type === "entitlement_grant.delivered" ? new Date() : undefined,
          },
        });
      }

      const payment = await prisma.payment.findFirst({
        where: { customerId: customer.id, status: "succeeded" },
        orderBy: { createdAt: "desc" },
      });

      // Only mail once the payment is known, so a free claim is labelled
      // correctly in the subject line rather than guessed at.
      if (payment) {
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

    case "license_key.revoked":
    case "entitlement_grant.revoked": {
      const keyValue = data.license_key?.key ?? data.key;
      if (!keyValue) return false;
      await prisma.licenseKey.updateMany({
        where: { key: keyValue },
        data: { status: "revoked" },
      });
      return true;
    }

    default:
      return false;
  }
}
