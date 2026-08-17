import { DOWNLOAD_TOKEN_USES } from "@contextjule/core/downloads";
import prisma from "@contextjule/db";
import { env } from "@contextjule/env/server";

import { purchaseEmail, sendEmail } from "../lib/email";
import { mintDownloadToken } from "../lib/tokens";

/**
 * Turning a Dodo webhook into a customer who can actually run the app.
 *
 * Everything here must be safe to run twice. Dodo follows Standard Webhooks and
 * retries on any non-2xx, and the events arrive out of order often enough that
 * `payment.succeeded` and `entitlement_grant.delivered` routinely race. So each
 * step upserts on a natural key and the email is only sent when the key is
 * actually in hand.
 */

export async function upsertCustomer(input: {
  email: string;
  dodoCustomerId?: string | null;
  name?: string | null;
  country?: string | null;
}) {
  const email = input.email.trim().toLowerCase();
  return prisma.customer.upsert({
    where: { email },
    create: {
      email,
      dodoCustomerId: input.dodoCustomerId ?? null,
      name: input.name ?? null,
      country: input.country ?? null,
    },
    // Only fill blanks. A webhook arriving late must not wipe a better value.
    update: {
      dodoCustomerId: input.dodoCustomerId ?? undefined,
      name: input.name ?? undefined,
      country: input.country ?? undefined,
    },
  });
}

export async function recordPayment(input: {
  dodoPaymentId: string;
  customerId: string;
  status: "pending" | "succeeded" | "failed" | "refunded" | "disputed";
  totalMinor: number;
  subtotalMinor?: number | null;
  currency?: string;
  discountCode?: string | null;
  paymentMethod?: string | null;
  raw?: unknown;
}) {
  const offer = resolveOffer(input.totalMinor, input.discountCode ?? null);
  return prisma.payment.upsert({
    where: { dodoPaymentId: input.dodoPaymentId },
    create: {
      dodoPaymentId: input.dodoPaymentId,
      customerId: input.customerId,
      status: input.status,
      offer,
      totalMinor: input.totalMinor,
      subtotalMinor: input.subtotalMinor ?? null,
      currency: input.currency ?? "USD",
      discountCode: input.discountCode ?? null,
      paymentMethod: input.paymentMethod ?? null,
      paidAt: input.status === "succeeded" ? new Date() : null,
      raw: (input.raw ?? null) as never,
    },
    update: {
      status: input.status,
      paidAt: input.status === "succeeded" ? new Date() : undefined,
      refundedAt: input.status === "refunded" ? new Date() : undefined,
      raw: (input.raw ?? null) as never,
    },
  });
}

/**
 * A free claim is a payment of zero against the free code. Keeping it in the
 * same table is deliberate: reporting, refunds and license issuance then have
 * one shape rather than two.
 */
function resolveOffer(totalMinor: number, discountCode: string | null): "full" | "launch" | "free" {
  if (totalMinor === 0) return "free";
  if (discountCode && discountCode === env.DODO_LAUNCH_DISCOUNT_CODE) return "launch";
  return "full";
}

export async function recordLicenseKey(input: {
  key: string;
  dodoLicenseKeyId?: string | null;
  customerId: string;
  paymentId?: string | null;
  activationsLimit?: number | null;
  activationsUsed?: number | null;
  expiresAt?: Date | null;
  status?: "active" | "expired" | "disabled" | "revoked";
}) {
  return prisma.licenseKey.upsert({
    where: { key: input.key },
    create: {
      key: input.key,
      dodoLicenseKeyId: input.dodoLicenseKeyId ?? null,
      customerId: input.customerId,
      paymentId: input.paymentId ?? null,
      activationsLimit: input.activationsLimit ?? null,
      activationsUsed: input.activationsUsed ?? 0,
      expiresAt: input.expiresAt ?? null,
      status: input.status ?? "active",
    },
    update: {
      dodoLicenseKeyId: input.dodoLicenseKeyId ?? undefined,
      paymentId: input.paymentId ?? undefined,
      activationsLimit: input.activationsLimit ?? undefined,
      activationsUsed: input.activationsUsed ?? undefined,
      expiresAt: input.expiresAt ?? undefined,
      status: input.status ?? undefined,
    },
  });
}

/** The newest published release, or null before the first ship. */
export async function latestRelease(channel: "stable" | "beta" = "stable") {
  return prisma.release.findFirst({
    where: { channel, yanked: false, publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    include: { artifacts: true },
  });
}

/** A fresh download link. Also the "resend my link" path. */
export async function issueDownloadToken(input: {
  email: string;
  customerId?: string | null;
  licenseKeyId?: string | null;
}) {
  const release = await latestRelease();
  const { token, tokenHash, expiresAt } = mintDownloadToken();

  await prisma.downloadToken.create({
    data: {
      tokenHash,
      email: input.email.trim().toLowerCase(),
      customerId: input.customerId ?? null,
      licenseKeyId: input.licenseKeyId ?? null,
      releaseId: release?.id ?? null,
      usesRemaining: DOWNLOAD_TOKEN_USES,
      expiresAt,
    },
  });

  return { token, url: `${env.SERVER_URL}/api/downloads/${token}`, expiresAt };
}

/**
 * The one thing the customer is waiting for: key + link, once.
 *
 * Guarded on the EmailLog rather than on a flag, so a webhook replay after a
 * crash mid-send does not double-mail, and a genuine resend still can.
 */
export async function deliverPurchase(input: {
  email: string;
  customerId: string;
  licenseKeyId?: string | null;
  licenseKey: string | null;
  free: boolean;
  force?: boolean;
}) {
  const template = input.free ? "purchase-free" : "purchase";

  if (!input.force) {
    const already = await prisma.emailLog.findFirst({
      where: { to: input.email.toLowerCase(), template, status: "sent" },
    });
    if (already) return { sent: false as const, reason: "already-delivered" as const };
  }

  const download = await issueDownloadToken({
    email: input.email,
    customerId: input.customerId,
    licenseKeyId: input.licenseKeyId ?? null,
  });

  await sendEmail(
    purchaseEmail({
      to: input.email,
      licenseKey: input.licenseKey,
      downloadUrl: download.url,
      free: input.free,
    }),
  );

  return { sent: true as const, expiresAt: download.expiresAt };
}
