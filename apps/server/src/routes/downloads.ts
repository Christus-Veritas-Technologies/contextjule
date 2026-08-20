import { detectPlatform, type Platform } from "@contextjule/core/downloads";
import prisma from "@contextjule/db";
import { Hono } from "hono";
import { z } from "zod";

import { badRequest, clientIp, gone, notFound } from "../lib/http";
import { hashToken, publicArtifactUrl, signArtifactUrl, verifyArtifactUrl } from "../lib/tokens";
import { deliverPurchase, latestRelease } from "../services/provisioning";

export const downloadRoutes = new Hono();

/** What the site's download page renders, and what the updater polls. */
downloadRoutes.get("/latest", async (c) => {
  const release = await latestRelease();
  if (!release) return c.json({ release: null });
  return c.json({
    release: {
      version: release.version,
      channel: release.channel,
      notes: release.notes,
      publishedAt: release.publishedAt,
      artifacts: release.artifacts.map((a) => ({
        platform: a.platform,
        arch: a.arch,
        filename: a.filename,
        sizeBytes: a.sizeBytes,
        sha256: a.sha256,
        // Public, and null when there is no public bucket configured. The
        // page falls back to "ask for your link again" rather than rendering
        // a button that goes nowhere.
        url: publicArtifactUrl(a.storageKey),
      })),
    },
  });
});

/**
 * Redeem a token from a purchase email.
 *
 * Rather than streaming the installer, this hands back short-lived signed URLs
 * — one per platform — so the file itself can sit behind a CDN and the link in
 * the email stays small, expiring and countable.
 */
downloadRoutes.get("/:token", async (c) => {
  const token = c.req.param("token");
  const record = await prisma.downloadToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { release: { include: { artifacts: true } } },
  });

  if (!record) throw notFound("unknown_token", "That download link is not one we issued.");
  if (record.revokedAt) throw gone("revoked", "That download link was revoked.");
  if (record.expiresAt < new Date()) {
    throw gone("expired", "That download link has expired. Ask for a fresh one below.");
  }
  if (record.usesRemaining <= 0) {
    throw gone("spent", "That download link has been used. Ask for a fresh one below.");
  }

  const release = record.release ?? (await latestRelease());
  if (!release) throw notFound("no_release", "There is no published build yet.");

  await prisma.$transaction([
    prisma.downloadToken.update({
      where: { id: record.id },
      data: { usesRemaining: { decrement: 1 }, lastUsedAt: new Date() },
    }),
    prisma.downloadEvent.create({
      data: {
        tokenId: record.id,
        ip: clientIp(c) ?? null,
        userAgent: c.req.header("user-agent") ?? null,
      },
    }),
  ]);

  const suggested: Platform | null = detectPlatform(c.req.header("user-agent"));

  return c.json({
    version: release.version,
    suggested,
    usesRemaining: record.usesRemaining - 1,
    artifacts: release.artifacts.map((a) => ({
      platform: a.platform,
      arch: a.arch,
      filename: a.filename,
      sizeBytes: a.sizeBytes,
      sha256: a.sha256,
      url: signArtifactUrl(a.storageKey),
    })),
  });
});

/**
 * The signed artifact URL itself, when no CDN is configured. Verifying here
 * means a URL copied out of the JSON above stops working in ten minutes.
 */
downloadRoutes.get("/file/*", async (c) => {
  const storageKey = c.req.path.replace(/^\/api\/downloads\/file\//, "");
  const ok = verifyArtifactUrl(storageKey, c.req.query("expires"), c.req.query("signature"));
  if (!ok) throw gone("bad_signature", "That link has expired.");

  const artifact = await prisma.releaseArtifact.findFirst({ where: { storageKey } });
  if (!artifact) throw notFound("unknown_artifact", "That build is not available.");

  // With no object store configured there is nothing to stream to; this is the
  // seam where a bucket redirect goes.
  return c.json({ filename: artifact.filename, storageKey, note: "Configure ARTIFACT_BASE_URL." });
});

/** "Send me my link again." Rate limited by the token TTL, not by a counter. */
downloadRoutes.post("/resend", async (c) => {
  const parsed = z
    .object({ email: z.email() })
    .safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) throw badRequest("invalid_email", "Check the email address.");

  const email = parsed.data.email.toLowerCase();
  const customer = await prisma.customer.findUnique({
    where: { email },
    include: { licenseKeys: { where: { status: "active" }, take: 1 } },
  });

  // Always the same answer, whether or not the address bought anything — this
  // endpoint must not confirm who is a customer.
  if (customer) {
    const key = customer.licenseKeys[0];
    await deliverPurchase({
      email,
      customerId: customer.id,
      licenseKeyId: key?.id ?? null,
      licenseKey: key?.key ?? null,
      free: false,
      // A resend is the one case that must bypass the once-only guard.
      force: true,
    });
  }

  return c.json({ ok: true });
});
