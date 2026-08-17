/**
 * Reading a Dodo webhook payload.
 *
 * Everything in this file is pure, and that is the point. The webhook handler
 * used to pick fields inline — `data.payment_id ?? data.id`, three levels of
 * optional chaining for an email — which meant the most fragile part of the
 * whole payment flow was the part that could only be exercised by sending a
 * real webhook at a real database.
 *
 * The field aliases are not defensiveness for its own sake. Dodo's payloads
 * differ by event: a `payment.succeeded` carries `payment_id` at the top level,
 * a `refund.succeeded` nests the payment under `payment`, and a license key
 * arrives either as `data.license_key` or as the data object itself depending
 * on whether it came from `license_key.created` or an entitlement grant. Each
 * alias below exists because one of those shapes needs it.
 *
 * No imports on purpose: no prisma, no env, no zod. That is what makes it
 * testable without a database.
 */

export type DodoEvent = {
  type: string;
  timestamp?: string;
  data: Record<string, unknown> & { payload_type?: string };
};

export type Offer = "full" | "launch" | "free";

/** Every event we act on. Anything else is acknowledged and ignored. */
export const HANDLED_EVENTS = [
  "payment.succeeded",
  "payment.failed",
  "payment.refunded",
  "refund.succeeded",
  "dispute.opened",
  "dispute.accepted",
  "license_key.created",
  "license_key.revoked",
  "entitlement_grant.created",
  "entitlement_grant.delivered",
  "entitlement_grant.revoked",
] as const;

export function isHandled(type: string): boolean {
  return (HANDLED_EVENTS as readonly string[]).includes(type);
}

// --- small readers ----------------------------------------------------------

function obj(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function str(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

/**
 * A money amount in minor units.
 *
 * Zero is a real, meaningful value here — a free claim is a payment of 0 — so
 * this must distinguish "absent" from "zero", which `?? 0` on a falsy check
 * would not. A negative or non-finite amount is treated as absent rather than
 * clamped: a refund arriving as a negative total should not silently become a
 * free purchase.
 */
function minor(value: unknown): number | null {
  const parsed = typeof value === "string" ? Number(value) : value;
  if (typeof parsed !== "number" || !Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed);
}

function firstStr(source: Record<string, unknown> | null, ...keys: string[]): string | null {
  if (!source) return null;
  for (const key of keys) {
    const found = str(source[key]);
    if (found) return found;
  }
  return null;
}

// --- customer ---------------------------------------------------------------

export interface CustomerFields {
  email: string;
  dodoCustomerId: string | null;
  name: string | null;
  country: string | null;
}

/**
 * The customer, from wherever this particular event carries them.
 *
 * Returns null without an email. Email is the only identity this product has —
 * there are no accounts — so a customer row with no email is not a partial
 * record, it is an unreachable one.
 */
export function customerFrom(event: DodoEvent): CustomerFields | null {
  const data = event.data;
  const customer =
    obj(data.customer) ??
    obj(obj(data.license_key)?.customer) ??
    obj(obj(data.payment)?.customer) ??
    obj(data.billing_customer);

  const email = str(customer?.email) ?? str(data.email) ?? str(data.customer_email);
  if (!email) return null;

  const billing = obj(data.billing) ?? obj(customer?.billing);

  return {
    email: email.toLowerCase(),
    dodoCustomerId: firstStr(customer, "customer_id", "id"),
    name: firstStr(customer, "name", "full_name"),
    country: firstStr(billing, "country", "country_code"),
  };
}

// --- payment ----------------------------------------------------------------

export interface PaymentFields {
  dodoPaymentId: string;
  totalMinor: number;
  subtotalMinor: number | null;
  currency: string;
  discountCode: string | null;
  paymentMethod: string | null;
  /** Set when Dodo tells us which checkout session produced this payment. */
  checkoutSessionId: string | null;
  /** `metadata.offer`, which our own checkout route sets. */
  declaredOffer: Offer | null;
}

export function paymentFrom(event: DodoEvent): PaymentFields | null {
  const data = event.data;
  const payment = obj(data.payment) ?? data;

  const dodoPaymentId = firstStr(payment, "payment_id", "id");
  if (!dodoPaymentId) return null;

  // `total_amount` is what was actually charged. `settlement_amount` is the
  // same figure after Dodo's own conversion and is the only one present on some
  // events — but it is in the settlement currency, so it is a last resort.
  //
  // An unreadable amount lands on 0, which `resolveOffer` will call free. That
  // is the right trade: the license key is issued by Dodo either way, so the
  // only cost of getting this wrong is a mislabelled row and the wrong email
  // subject line — whereas refusing the payload would drop a real purchase.
  const total = minor(payment.total_amount) ?? minor(payment.settlement_amount) ?? 0;

  const metadata = obj(payment.metadata) ?? obj(data.metadata);
  const declared = str(metadata?.offer);

  return {
    dodoPaymentId,
    totalMinor: total,
    subtotalMinor: minor(payment.subtotal_amount),
    currency: firstStr(payment, "currency", "settlement_currency") ?? "USD",
    discountCode: firstStr(payment, "discount_code", "discount_id"),
    paymentMethod: firstStr(payment, "payment_method", "payment_method_type"),
    checkoutSessionId: firstStr(payment, "checkout_session_id", "session_id"),
    declaredOffer: declared === "full" || declared === "launch" || declared === "free" ? declared : null,
  };
}

/**
 * Which offer a payment came through.
 *
 * A total of zero is free, whatever anyone claimed in metadata — the amount is
 * the fact and the metadata is a hint that a client could have forged. Below
 * that, a matching launch code wins, then the client's own declaration, then
 * full price. Deciding this here rather than at the call site is what lets it
 * be tested without a Dodo account.
 */
export function resolveOffer(input: {
  totalMinor: number;
  discountCode?: string | null;
  declaredOffer?: Offer | null;
  launchCode?: string | null;
  freeCode?: string | null;
}): Offer {
  if (input.totalMinor === 0) return "free";

  const code = input.discountCode?.trim().toUpperCase() ?? null;
  const launch = input.launchCode?.trim().toUpperCase() ?? null;
  const free = input.freeCode?.trim().toUpperCase() ?? null;

  if (code && free && code === free) return "free";
  if (code && launch && code === launch) return "launch";
  // A non-zero total against no known code is full price, even if the client
  // asked for a discount — the charge is what happened.
  if (!code && input.declaredOffer === "launch") return "launch";
  return "full";
}

// --- refunds and disputes ---------------------------------------------------

/** The payment a refund or dispute event is about. */
export function refundTargetFrom(event: DodoEvent): string | null {
  const data = event.data;
  return (
    firstStr(data, "payment_id") ??
    firstStr(obj(data.payment), "payment_id", "id") ??
    firstStr(obj(data.dispute), "payment_id") ??
    firstStr(obj(data.refund), "payment_id")
  );
}

// --- license keys -----------------------------------------------------------

export interface LicenseKeyFields {
  key: string;
  dodoLicenseKeyId: string | null;
  activationsLimit: number | null;
  activationsUsed: number | null;
  expiresAt: Date | null;
  /** Present on entitlement grant events. */
  grantId: string | null;
}

export function licenseKeyFrom(event: DodoEvent): LicenseKeyFields | null {
  const data = event.data;
  // `license_key.created` nests the key; an entitlement grant may deliver the
  // key fields on the data object itself.
  const source = obj(data.license_key) ?? data;

  const key = firstStr(source, "key", "license_key");
  if (!key) return null;

  const expires = str(source.expires_at);
  const expiresAt = expires ? new Date(expires) : null;

  return {
    key,
    dodoLicenseKeyId: firstStr(source, "id", "license_key_id"),
    activationsLimit: countOf(source.activations_limit),
    // Dodo calls the used count `instances_count` on the key object. It is the
    // number of machines currently activated, which is exactly our
    // `activationsUsed`.
    activationsUsed: countOf(source.instances_count) ?? countOf(source.activations_used),
    // An unparseable date is worse than none: it would store Invalid Date and
    // make every future comparison false.
    expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null,
    grantId: firstStr(data, "grant_id") ?? (obj(data.license_key) ? firstStr(data, "id") : null),
  };
}

function countOf(value: unknown): number | null {
  const parsed = typeof value === "string" ? Number(value) : value;
  if (typeof parsed !== "number" || !Number.isFinite(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
}

/** The key named by a revocation event, which carries far less than a creation. */
export function revokedKeyFrom(event: DodoEvent): string | null {
  const data = event.data;
  return firstStr(obj(data.license_key), "key", "license_key") ?? firstStr(data, "key", "license_key");
}

// --- grants -----------------------------------------------------------------

export function grantStatusFor(type: string): "pending" | "delivered" | "revoked" | null {
  if (type === "entitlement_grant.delivered") return "delivered";
  if (type === "entitlement_grant.created") return "pending";
  if (type === "entitlement_grant.revoked") return "revoked";
  return null;
}
