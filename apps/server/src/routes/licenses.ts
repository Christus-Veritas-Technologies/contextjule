import {
  activateRequestSchema,
  deactivateRequestSchema,
  validateRequestSchema,
} from "@contextjule/core/licensing";
import prisma from "@contextjule/db";
import { Hono } from "hono";

import { dodo, DODO_PUBLIC_BASE } from "../lib/dodo";
import { badRequest } from "../lib/http";

/**
 * License activation.
 *
 * Dodo's activate/validate/deactivate endpoints are public, so the desktop app
 * could call them directly and skip this server entirely — and it deliberately
 * falls back to doing exactly that when this API is unreachable. What routing
 * through here buys is the activation landing in our own database, so support
 * can answer "which machines is my key on" and free a slot for someone.
 *
 * That means none of this is a security boundary. Dodo's answer is the answer.
 */
export const licenseRoutes = new Hono();

/** Told to the desktop app at first run so it knows where to fall back to. */
licenseRoutes.get("/config", (c) => {
  return c.json({ publicBase: DODO_PUBLIC_BASE });
});

licenseRoutes.post("/activate", async (c) => {
  const parsed = activateRequestSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) throw badRequest("invalid_body", "That key does not look right.");
  const { licenseKey, deviceName, machineId, platform, appVersion } = parsed.data;

  const stored = await prisma.licenseKey.findUnique({
    where: { key: licenseKey },
    include: { activations: { where: { deactivatedAt: null } } },
  });

  // A machine that has activated before reuses its slot rather than burning a
  // new one — reinstalls and OS upgrades should not cost the customer anything.
  const existing = stored?.activations.find((a) => a.machineId === machineId);
  if (existing?.dodoInstanceId) {
    const check = await dodo.licenses.validate({
      license_key: licenseKey,
      license_key_instance_id: existing.dodoInstanceId,
    });
    if (check.valid) {
      await prisma.licenseActivation.update({
        where: { id: existing.id },
        data: { lastSeenAt: new Date(), appVersion: appVersion ?? undefined },
      });
      return c.json({
        status: "active",
        licenseKeyInstanceId: existing.dodoInstanceId,
        activationsUsed: stored?.activationsUsed ?? null,
        activationsLimit: stored?.activationsLimit ?? null,
      });
    }
  }

  const activation = await dodo.licenses.activate({ license_key: licenseKey, name: deviceName });

  if (stored) {
    await prisma.licenseActivation.upsert({
      where: { licenseKeyId_machineId: { licenseKeyId: stored.id, machineId } },
      create: {
        licenseKeyId: stored.id,
        dodoInstanceId: activation.id,
        machineId,
        deviceName,
        platform,
        appVersion: appVersion ?? null,
      },
      update: {
        dodoInstanceId: activation.id,
        deviceName,
        platform,
        appVersion: appVersion ?? null,
        deactivatedAt: null,
        lastSeenAt: new Date(),
      },
    });
    await prisma.licenseKey.update({
      where: { id: stored.id },
      data: { activationsUsed: { increment: 1 } },
    });
  }

  return c.json({
    status: "active",
    licenseKeyInstanceId: activation.id,
    activationsUsed: stored ? stored.activationsUsed + 1 : null,
    activationsLimit: stored?.activationsLimit ?? null,
  });
});

licenseRoutes.post("/validate", async (c) => {
  const parsed = validateRequestSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) throw badRequest("invalid_body", "That key does not look right.");

  const result = await dodo.licenses.validate({
    license_key: parsed.data.licenseKey,
    ...(parsed.data.licenseKeyInstanceId
      ? { license_key_instance_id: parsed.data.licenseKeyInstanceId }
      : {}),
  });

  if (result.valid && parsed.data.licenseKeyInstanceId) {
    await prisma.licenseActivation.updateMany({
      where: { dodoInstanceId: parsed.data.licenseKeyInstanceId },
      data: { lastSeenAt: new Date() },
    });
  }

  return c.json({ valid: result.valid, status: result.valid ? "active" : "invalid" });
});

licenseRoutes.post("/deactivate", async (c) => {
  const parsed = deactivateRequestSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) throw badRequest("invalid_body", "Missing the activation to release.");

  await dodo.licenses.deactivate({
    license_key: parsed.data.licenseKey,
    license_key_instance_id: parsed.data.licenseKeyInstanceId,
  });

  const activation = await prisma.licenseActivation.findUnique({
    where: { dodoInstanceId: parsed.data.licenseKeyInstanceId },
  });
  if (activation) {
    await prisma.licenseActivation.update({
      where: { id: activation.id },
      data: { deactivatedAt: new Date() },
    });
    await prisma.licenseKey.update({
      where: { id: activation.licenseKeyId },
      data: { activationsUsed: { decrement: 1 } },
    });
  }

  return c.json({ status: "deactivated" });
});

/** The machines a key is running on, so a customer can free one up. */
licenseRoutes.get("/:key/activations", async (c) => {
  const stored = await prisma.licenseKey.findUnique({
    where: { key: c.req.param("key").toUpperCase() },
    include: { activations: { where: { deactivatedAt: null }, orderBy: { lastSeenAt: "desc" } } },
  });
  if (!stored) return c.json({ activations: [] });

  return c.json({
    activationsLimit: stored.activationsLimit,
    activationsUsed: stored.activationsUsed,
    activations: stored.activations.map((a) => ({
      id: a.dodoInstanceId,
      deviceName: a.deviceName,
      platform: a.platform,
      lastSeenAt: a.lastSeenAt,
    })),
  });
});
