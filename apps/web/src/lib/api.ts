import type { Platform } from "@contextjule/core/downloads";
import { FREE_LIMIT, type PromoState } from "@contextjule/core/promo";
import { env } from "@contextjule/env/web";

/**
 * Everything the site asks the API for.
 *
 * The offer is deliberately absent from `startCheckout`: the server decides
 * which phase of the launch it is in and applies the matching discount code.
 * The page sends what it *believed* the offer was, and gets a 409 back if that
 * has moved on — so a stale tab can never charge someone a price the button
 * did not show them.
 */
export const API = env.NEXT_PUBLIC_SERVER_URL;

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function readError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
  return new ApiError(
    body.error ?? "request_failed",
    body.message ?? "Something went wrong. Try again in a moment.",
    response.status,
  );
}

/**
 * The promotion as the server sees it.
 *
 * Falls back to an untouched free run rather than throwing. A landing page that
 * renders nothing because the API is briefly unreachable is worse than one
 * showing a slightly optimistic counter that corrects itself a second later
 * over the live stream.
 */
export const PROMO_FALLBACK: PromoState = {
  phase: "free",
  offer: "free",
  amount: 0,
  strikeAmount: 1499,
  percentOff: 100,
  freeLimit: FREE_LIMIT,
  freeClaimed: 0,
  freeRemaining: FREE_LIMIT,
  endsAt: null,
  msRemaining: 0,
};

export async function fetchPromo(signal?: AbortSignal): Promise<PromoState> {
  try {
    const response = await fetch(`${API}/api/promo`, { cache: "no-store", signal });
    if (!response.ok) return PROMO_FALLBACK;
    return (await response.json()) as PromoState;
  } catch {
    return PROMO_FALLBACK;
  }
}

/** Start a checkout and hand back the URL to send the buyer to. */
export async function startCheckout(input: {
  expectedOffer: PromoState["offer"];
  email?: string;
  name?: string;
}): Promise<{ checkoutUrl: string; sessionId: string }> {
  const response = await fetch(`${API}/api/checkout`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) throw await readError(response);
  return (await response.json()) as { checkoutUrl: string; sessionId: string };
}

export interface CheckoutStatus {
  sessionId: string;
  status: string;
  offer: string;
  paid: boolean;
  licenseKey: string | null;
  email: string | null;
  amountMinor: number | null;
  currency: string;
}

export async function fetchCheckoutStatus(sessionId: string): Promise<CheckoutStatus | null> {
  const response = await fetch(`${API}/api/checkout/${encodeURIComponent(sessionId)}`, {
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) throw await readError(response);
  return (await response.json()) as CheckoutStatus;
}

/** Ask for the purchase email to be sent again. Always resolves, by design. */
export async function resendDownload(email: string): Promise<void> {
  await fetch(`${API}/api/downloads/resend`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export interface LatestRelease {
  version: string;
  channel: string;
  notes: string | null;
  publishedAt: string | null;
  artifacts: Array<{
    platform: Platform;
    arch: string;
    filename: string;
    sizeBytes: number | null;
    sha256: string | null;
    /** Null when no public bucket is configured; the page then offers the
     *  emailed link instead of a dead button. */
    url: string | null;
  }>;
}

/** Null before the first build ships, which is a real state and not an error. */
export async function fetchLatestRelease(): Promise<LatestRelease | null> {
  try {
    const response = await fetch(`${API}/api/downloads/latest`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { release: LatestRelease | null };
    return body.release;
  } catch {
    return null;
  }
}
