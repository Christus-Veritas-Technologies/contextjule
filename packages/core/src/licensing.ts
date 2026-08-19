/**
 * Licensing. A purchase through Dodo Payments issues a license key; the desktop
 * app activates that key against a machine and caches the result so it keeps
 * working offline.
 *
 * Dodo's activate/validate/deactivate endpoints are public — they need no API
 * key — so the desktop app can call them directly. We proxy them anyway so a
 * machine activation lands in our own database and support can see it.
 */
import { z } from "zod";

export const LICENSE_STATUSES = [
  "unlicensed",
  "active",
  "expired",
  "revoked",
  "limit_reached",
  "offline_grace",
  "invalid",
] as const;
export type LicenseStatus = (typeof LICENSE_STATUSES)[number];

/**
 * How long a cached validation keeps the app running with no network. Long
 * enough to survive a flight and a bad hotel wifi, short enough that a refund
 * takes effect within a working week.
 */
export const OFFLINE_GRACE_MS = 7 * 24 * 60 * 60 * 1_000;

/** Re-validate in the background at most this often. */
export const REVALIDATE_EVERY_MS = 24 * 60 * 60 * 1_000;

/**
 * A license key, exactly as Dodo issued it.
 *
 * This schema used to uppercase the value. That was written against the
 * `PRO-AAAA-BBBB-CCCC-DDDD` shape Dodo's docs show for formatted keys — but the
 * keys actually issued are lowercase UUIDs (`fc62d7ac-715d-4c69-…`), and Dodo
 * looks them up case-sensitively. Uppercasing turned every real key into one
 * Dodo had never heard of: a 404 on activate, shown to the buyer as "that key
 * was not recognised", seconds after they paid. It also missed our own
 * `LicenseKey` row, which the webhook stores verbatim.
 *
 * The key is an opaque token. The only safe transform is none — trim the
 * whitespace a paste picks up and leave the rest alone.
 */
export const licenseKeySchema = z
  .string()
  .trim()
  .min(8, "That key looks too short.")
  .max(128);

export const activateRequestSchema = z.object({
  licenseKey: licenseKeySchema,
  /** Shown in the customer's dashboard so they can tell machines apart. */
  deviceName: z.string().trim().min(1).max(120),
  /** Stable per-machine id so a reinstall does not burn an activation slot. */
  machineId: z.string().trim().min(8).max(200),
  platform: z.enum(["windows", "macos", "linux"]),
  appVersion: z.string().trim().max(40).optional(),
});
export type ActivateRequest = z.infer<typeof activateRequestSchema>;

export const validateRequestSchema = z.object({
  licenseKey: licenseKeySchema,
  licenseKeyInstanceId: z.string().trim().min(1).max(200).optional(),
});
export type ValidateRequest = z.infer<typeof validateRequestSchema>;

export const deactivateRequestSchema = z.object({
  licenseKey: licenseKeySchema,
  licenseKeyInstanceId: z.string().trim().min(1).max(200),
});
export type DeactivateRequest = z.infer<typeof deactivateRequestSchema>;

export interface LicenseState {
  readonly status: LicenseStatus;
  readonly licenseKey: string | null;
  readonly licenseKeyInstanceId: string | null;
  readonly activationsUsed: number | null;
  readonly activationsLimit: number | null;
  /** ISO 8601, or null for a key with no expiry. */
  readonly expiresAt: string | null;
  /** ISO 8601 of the last successful online validation. */
  readonly lastValidatedAt: string | null;
}

export const UNLICENSED: LicenseState = {
  status: "unlicensed",
  licenseKey: null,
  licenseKeyInstanceId: null,
  activationsUsed: null,
  activationsLimit: null,
  expiresAt: null,
  lastValidatedAt: null,
};

/** Whether the app should unlock, given a cached state and the current time. */
export function isUnlocked(state: LicenseState, now: number = Date.now()): boolean {
  if (state.status === "active") return true;
  if (state.status !== "offline_grace") return false;
  if (!state.lastValidatedAt) return false;
  const last = Date.parse(state.lastValidatedAt);
  if (Number.isNaN(last)) return false;
  return now - last < OFFLINE_GRACE_MS;
}

/** Milliseconds of offline grace left, or 0 once it has run out. */
export function graceRemainingMs(state: LicenseState, now: number = Date.now()): number {
  if (!state.lastValidatedAt) return 0;
  const last = Date.parse(state.lastValidatedAt);
  if (Number.isNaN(last)) return 0;
  return Math.max(0, OFFLINE_GRACE_MS - (now - last));
}

/** A one-line reason to show under the key field when the app stays locked. */
export function licenseMessage(state: LicenseState): string {
  switch (state.status) {
    case "active":
      return "Licensed. Thank you.";
    case "offline_grace":
      return "Offline. Running on a cached license.";
    case "expired":
      return "This key has expired.";
    case "revoked":
      return "This key was revoked — a refund or chargeback, usually.";
    case "limit_reached":
      return "Every activation on this key is in use. Free one up first.";
    case "invalid":
      return "That key was not recognised.";
    default:
      return "Enter the key from your purchase email.";
  }
}
