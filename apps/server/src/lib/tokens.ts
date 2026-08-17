import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { DOWNLOAD_TOKEN_TTL_MS, SIGNED_URL_TTL_MS } from "@contextjule/core/downloads";
import { env } from "@contextjule/env/server";

/**
 * Download links.
 *
 * Two layers, and it is worth being precise about what each one is for:
 *
 *   1. A download TOKEN goes in the purchase email. It is random, stored only
 *      as a SHA-256 hash, expires, and has a small use count. Losing the
 *      database does not leak working links; leaking the email does not give
 *      anyone a permanent mirror.
 *   2. Redeeming a token returns a short-lived HMAC-SIGNED URL for one
 *      artifact. That URL is what a browser or CDN actually fetches.
 *
 * Neither layer protects the product — the license key does that. These protect
 * the bandwidth and keep an installer from being posted as a permalink, which
 * is exactly why a free promotional copy can be emailed the same installer as a
 * paid one without inventing a second, weaker gate.
 */

/** A fresh token. The plaintext is returned once and never stored. */
export function mintDownloadToken(): { token: string; tokenHash: string; expiresAt: Date } {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + DOWNLOAD_TOKEN_TTL_MS),
  };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** A signed URL for one artifact, valid for a few minutes. */
export function signArtifactUrl(storageKey: string, expiresInMs = SIGNED_URL_TTL_MS): string {
  const expires = Date.now() + expiresInMs;
  const signature = sign(`${storageKey}:${expires}`);
  const base = env.ARTIFACT_BASE_URL ?? `${env.SERVER_URL}/api/downloads/file`;
  const url = new URL(`${base.replace(/\/$/, "")}/${storageKey.replace(/^\//, "")}`);
  url.searchParams.set("expires", String(expires));
  url.searchParams.set("signature", signature);
  return url.toString();
}

/** Verify a signed artifact URL. Constant-time, and expiry is checked first. */
export function verifyArtifactUrl(
  storageKey: string,
  expires: string | undefined,
  signature: string | undefined,
): boolean {
  if (!expires || !signature) return false;
  const expiresAt = Number(expires);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  return safeEqual(signature, sign(`${storageKey}:${expiresAt}`));
}

function sign(value: string): string {
  return createHmac("sha256", env.DOWNLOAD_SIGNING_SECRET).update(value).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
