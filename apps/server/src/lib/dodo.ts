import { env } from "@contextjule/env/server";
import DodoPayments from "dodopayments";

/**
 * The Dodo Payments client.
 *
 * Note the split: `checkoutSessions`, `licenseKeys` and `discounts` need the
 * API key and run here. The `licenses.activate | validate | deactivate`
 * endpoints are public and take no key at all, which is why the desktop app can
 * verify a purchase with no server of ours in the path — and why the app keeps
 * working if this API is down.
 */
export const dodo = new DodoPayments({
  bearerToken: env.DODO_API_KEY,
  webhookKey: env.DODO_WEBHOOK_KEY,
  environment: env.DODO_ENVIRONMENT,
});

/** Base URL of Dodo's public license endpoints, for the desktop app to use. */
export const DODO_PUBLIC_BASE =
  env.DODO_ENVIRONMENT === "live_mode"
    ? "https://live.dodopayments.com"
    : "https://test.dodopayments.com";

export type DodoWebhookPayload = {
  business_id?: string;
  type: string;
  timestamp?: string;
  data: Record<string, unknown> & { payload_type?: string };
};
