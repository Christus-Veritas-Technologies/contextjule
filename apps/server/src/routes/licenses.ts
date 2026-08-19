import {
  activateRequestSchema,
  deactivateRequestSchema,
  type LicenseState,
  type LicenseStatus,
  validateRequestSchema,
} from "@contextjule/core/licensing";
import prisma from "@contextjule/db";
import { Hono } from "hono";

import { dodo, DODO_PUBLIC_BASE } from "../lib/dodo";
import { ApiError, badRequest } from "../lib/http";

/**
 * Licensing.
 *
 * Worth being precise about what Dodo actually hands back, because it shapes
 * this whole file:
 *
 *   POST /licenses/activate  →  the instance, plus product and customer.
 *                               403 inactive, 404 unknown, 422 limit reached.
 *   POST /licenses/validate  →  `{ "valid": boolean }`. That is all of it.
 *
 * So activate can explain itself and validate cannot. Dodo is still the
 * authority on whether a key is good — we never override its verdict — but a
 * bare `false` is useless to a customer staring at a locked app. This endpoint
 * merges Dodo's answer with our own `LicenseKey` row, which the webhooks keep
 * current, so the app can say *why*: expired, revoked after a refund, or every
 * activation in use.
 *
 * None of this is a security boundary. The desktop app falls back to calling
 * Dodo directly when this API is unreachable, and to its cached row after that.
 */
export const licenseRoutes = new Hono();

/** Told to the app at first run so it knows where to fall back to. */
licenseRoutes.get("/config", (c) => c.json({ publicBase: DODO_PUBLIC_BASE }));

/** Dodo's status codes, in the words the customer should read. */
function reasonFor(status: number): { code: string; message: string; licenseStatus: LicenseStatus } {
  switch (status) {
    case 403:
      return {
        code: "key_inactive",
        message: "This key is no longer active — a refund or chargeback, usually.",
        licenseStatus: "revoked",
      };
    case 404:
      return {
        code: "unknown_key",
        message: "That key was not recognised. Check it against your purchase email.",
        licenseStatus: "invalid",
      };
    case 422:
      return {
        code: "limit_reached",
        message: "Every activation on this key is in use. Free one up first.",
        licenseStatus: "limit_reached",
      };
    default:
      return {
        code: "upstream_error",
        message: "The licence server could not be reached. Try again shortly.",
        licenseStatus: "invalid",
      };
  }
}

/** The Dodo SDK throws with a numeric `status`; anything else is a real bug. */
function upstreamStatus(error: unknown): number | null {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status: unknown }).status;
    if (typeof status === "number") return status;
  }
  return null;
}

/**
 * Find a stored key, forgiving case, and answer with the canonical spelling.
 *
 * Dodo issues lowercase UUID keys and matches them case-sensitively. The thanks
 * page renders the key in Silkscreen, a font with no lowercase glyphs, so a
 * buyer reading it off the screen types it back in uppercase — and Dodo has
 * never heard of `FC62D7AC-…`. Our own row holds the key exactly as the webhook
 * delivered it, so an insensitive match recovers the real spelling and
 * everything downstream talks to Dodo in Dodo's own case.
 *
 * The exact match runs first because it is the indexed unique lookup and it is
 * what almost every request hits; the insensitive scan is the recovery path.
 *
 * A key we have no row for cannot be repaired this way — nothing here knows its
 * true case — so it goes to Dodo as typed. That is only the window between the
 * payment and its webhook, and the copy button on the thanks page puts the
 * right case on the clipboard anyway.
 */
async function findStoredKey(licenseKey: string) {
  // The include is written out twice rather than hoisted to a shared const:
  // Prisma infers the shape of the row from the literal `true`s, and a hoisted
  // object widens them to `boolean`, which loses `customer` off the result type.
  const exact = await prisma.licenseKey.findUnique({
    where: { key: licenseKey },
    include: { customer: true, activations: { where: { deactivatedAt: null } } },
  });
  if (exact) return exact;
  return prisma.licenseKey.findFirst({
    where: { key: { equals: licenseKey, mode: "insensitive" } },
    include: { customer: true, activations: { where: { deactivatedAt: null } } },
  });
}

licenseRoutes.post("/activate", async (c) => {
  const parsed = activateRequestSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) throw badRequest("invalid_body", "That key does not look right.");
  const { deviceName, machineId, platform, appVersion } = parsed.data;

  const stored = await findStoredKey(parsed.data.licenseKey);
  // Dodo's spelling wins wherever we have it; the typed one only when we do not.
  const licenseKey = stored?.key ?? parsed.data.licenseKey;

  // A machine that has activated before reuses its slot rather than burning a
  // new one. Reinstalls and OS upgrades should not cost the customer anything.
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
      return c.json(describe(stored, existing.dodoInstanceId, "active"));
    }
  }

  let instanceId: string;
  try {
    const activation = await dodo.licenses.activate({
      license_key: licenseKey,
      name: deviceName,
    });
    instanceId = activation.id;
  } catch (error) {
    const status = upstreamStatus(error);
    if (status) {
      const reason = reasonFor(status);
      // Mirror what Dodo just told us, so the next validate is already right.
      if (stored && reason.licenseStatus === "revoked") {
        await prisma.licenseKey.update({ where: { id: stored.id }, data: { status: "revoked" } });
      }
      // Forward the code so the desktop client can map it without parsing prose.
      throw new ApiError(status === 422 ? 422 : status === 404 ? 404 : 403, reason.code, reason.message);
    }
    throw error;
  }

  if (stored) {
    await prisma.licenseActivation.upsert({
      where: { licenseKeyId_machineId: { licenseKeyId: stored.id, machineId } },
      create: {
        licenseKeyId: stored.id,
        dodoInstanceId: instanceId,
        machineId,
        deviceName,
        platform,
        appVersion: appVersion ?? null,
      },
      update: {
        dodoInstanceId: instanceId,
        deviceName,
        platform,
        appVersion: appVersion ?? null,
        deactivatedAt: null,
        lastSeenAt: new Date(),
      },
    });
    const updated = await prisma.licenseKey.update({
      where: { id: stored.id },
      data: { activationsUsed: { increment: 1 } },
      include: { customer: true, activations: { where: { deactivatedAt: null } } },
    });
    return c.json(describe(updated, instanceId, "active"));
  }

  // The key is real to Dodo but we have not seen its webhook yet. Say so
  // honestly rather than inventing counts we do not have.
  return c.json({
    valid: true,
    status: "active" satisfies LicenseStatus,
    licenseKeyInstanceId: instanceId,
    email: null,
    activationsUsed: null,
    activationsLimit: null,
    expiresAt: null,
    dodoPublicBase: DODO_PUBLIC_BASE,
  });
});

licenseRoutes.post("/validate", async (c) => {
  const parsed = validateRequestSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) throw badRequest("invalid_body", "That key does not look right.");
  const { licenseKeyInstanceId } = parsed.data;

  const stored = await findStoredKey(parsed.data.licenseKey);
  const licenseKey = stored?.key ?? parsed.data.licenseKey;

  let valid = false;
  try {
    const result = await dodo.licenses.validate({
      license_key: licenseKey,
      ...(licenseKeyInstanceId ? { license_key_instance_id: licenseKeyInstanceId } : {}),
    });
    valid = result.valid;
  } catch (error) {
    const status = upstreamStatus(error);
    // A 4xx from Dodo is an answer, not an outage: the key is bad. Anything
    // else means we genuinely do not know, and the client should keep its cache
    // rather than lock a paying customer out over our downtime.
    if (!status || status >= 500) {
      throw new ApiError(503, "upstream_unavailable", "Could not reach the licence server.");
    }
    valid = false;
  }

  if (valid && licenseKeyInstanceId) {
    await prisma.licenseActivation.updateMany({
      where: { dodoInstanceId: licenseKeyInstanceId },
      data: { lastSeenAt: new Date() },
    });
  }

  // Dodo said no. Our row is what turns that into a sentence.
  const status: LicenseStatus = valid
    ? "active"
    : stored?.status === "revoked"
      ? "revoked"
      : stored?.expiresAt && stored.expiresAt < new Date()
        ? "expired"
        : stored && stored.activationsLimit !== null && stored.activationsUsed >= stored.activationsLimit
          ? "limit_reached"
          : "invalid";

  return c.json({ ...describe(stored, licenseKeyInstanceId ?? null, status), valid });
});

licenseRoutes.post("/deactivate", async (c) => {
  const parsed = deactivateRequestSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) throw badRequest("invalid_body", "Missing the activation to release.");

  const canonical = (await findStoredKey(parsed.data.licenseKey))?.key ?? parsed.data.licenseKey;

  try {
    await dodo.licenses.deactivate({
      license_key: canonical,
      license_key_instance_id: parsed.data.licenseKeyInstanceId,
    });
  } catch (error) {
    // A slot that is already gone is the outcome we wanted anyway.
    if (upstreamStatus(error) !== 404) throw error;
  }

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
  const stored = await prisma.licenseKey.findFirst({
    // Case-insensitive for the same reason as `findStoredKey` — this one is
    // read-only and never talks to Dodo, so it can match loosely outright.
    where: { key: { equals: c.req.param("key").trim(), mode: "insensitive" } },
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

type StoredKey = {
  key: string;
  activationsUsed: number;
  activationsLimit: number | null;
  expiresAt: Date | null;
  customer?: { email: string } | null;
} | null;

/** One shape for every response, matching `LicenseState` in @contextjule/core. */
function describe(
  stored: StoredKey,
  instanceId: string | null,
  status: LicenseStatus,
): LicenseState & { valid: boolean; dodoPublicBase: string } {
  return {
    valid: status === "active",
    status,
    licenseKey: stored?.key ?? null,
    licenseKeyInstanceId: instanceId,
    activationsUsed: stored?.activationsUsed ?? null,
    activationsLimit: stored?.activationsLimit ?? null,
    expiresAt: stored?.expiresAt?.toISOString() ?? null,
    lastValidatedAt: new Date().toISOString(),
    // Not part of LicenseState, but the app shows "licensed to …" and this is
    // the only place that fact exists.
    ...(stored?.customer?.email ? { email: stored.customer.email } : { email: null }),
    // Which Dodo the key was issued by. The desktop app caches this so its
    // offline fallback — which calls Dodo directly when this API is unreachable
    // — asks the same environment the key exists in. Without it a test-mode key
    // is checked against live and comes back invalid on a copy that was paid for.
    dodoPublicBase: DODO_PUBLIC_BASE,
  } as LicenseState & { valid: boolean; email: string | null; dodoPublicBase: string };
}
