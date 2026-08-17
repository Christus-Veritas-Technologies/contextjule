import type { Offer } from "@contextjule/core/pricing";
import { env } from "@contextjule/env/web";

/** Start a checkout and hand back the URL to send the buyer to. */
export async function startCheckout(offer: Offer, email?: string): Promise<string> {
  const response = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/checkout`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ offer, ...(email ? { email } : {}) }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? "Checkout could not be started. Try again in a moment.");
  }

  const body = (await response.json()) as { checkoutUrl: string };
  return body.checkoutUrl;
}

/** Ask for the purchase email to be sent again. Always resolves, by design. */
export async function resendDownload(email: string): Promise<void> {
  await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/downloads/resend`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });
}
