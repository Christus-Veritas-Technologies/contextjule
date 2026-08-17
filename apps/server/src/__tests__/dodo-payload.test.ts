import { describe, expect, it } from "bun:test";

import {
  customerFrom,
  type DodoEvent,
  grantStatusFor,
  isHandled,
  licenseKeyFrom,
  paymentFrom,
  refundTargetFrom,
  resolveOffer,
  revokedKeyFrom,
} from "../lib/dodo-payload";

/**
 * These are the payload shapes the webhook handler has to survive. Each fixture
 * below is written the way Dodo actually sends it — the top-level payment on a
 * `payment.succeeded`, the nested one on a refund, the key that arrives either
 * under `license_key` or bare — because the failure mode being tested is not a
 * crash, it is a silently missing field that turns into a customer who paid and
 * got nothing.
 */

function event(type: string, data: Record<string, unknown>): DodoEvent {
  return { type, timestamp: "2026-08-17T12:00:00Z", data };
}

const PAYMENT_SUCCEEDED = event("payment.succeeded", {
  payload_type: "Payment",
  payment_id: "pay_123",
  total_amount: 499,
  subtotal_amount: 999,
  currency: "USD",
  discount_code: "LAUNCH50",
  payment_method: "card",
  checkout_session_id: "cks_abc",
  metadata: { offer: "launch" },
  customer: { customer_id: "cus_1", email: "Buyer@Example.com ", name: "A Buyer" },
  billing: { country: "KE" },
});

describe("customerFrom", () => {
  it("reads the customer and lowercases the address", () => {
    expect(customerFrom(PAYMENT_SUCCEEDED)).toEqual({
      email: "buyer@example.com",
      dodoCustomerId: "cus_1",
      name: "A Buyer",
      country: "KE",
    });
  });

  it("finds a customer nested under the license key", () => {
    const parsed = customerFrom(
      event("license_key.created", {
        license_key: { key: "PRO-A", customer: { email: "nested@example.com" } },
      }),
    );
    expect(parsed?.email).toBe("nested@example.com");
    expect(parsed?.dodoCustomerId).toBeNull();
  });

  it("returns null without an email, because email is the only identity", () => {
    expect(customerFrom(event("payment.succeeded", { customer: { customer_id: "cus_1" } }))).toBeNull();
  });

  it("treats an empty-string email as absent rather than as an address", () => {
    expect(customerFrom(event("payment.succeeded", { customer: { email: "   " } }))).toBeNull();
  });
});

describe("paymentFrom", () => {
  it("reads a top-level payment", () => {
    expect(paymentFrom(PAYMENT_SUCCEEDED)).toEqual({
      dodoPaymentId: "pay_123",
      totalMinor: 499,
      subtotalMinor: 999,
      currency: "USD",
      discountCode: "LAUNCH50",
      paymentMethod: "card",
      checkoutSessionId: "cks_abc",
      declaredOffer: "launch",
    });
  });

  it("reads a payment nested under `payment`", () => {
    const parsed = paymentFrom(
      event("refund.succeeded", { payment: { payment_id: "pay_9", total_amount: 999 } }),
    );
    expect(parsed?.dodoPaymentId).toBe("pay_9");
  });

  it("keeps a zero total, because a free claim is a payment of zero", () => {
    const parsed = paymentFrom(event("payment.succeeded", { payment_id: "pay_0", total_amount: 0 }));
    expect(parsed?.totalMinor).toBe(0);
  });

  it("falls back to `id` when there is no `payment_id`", () => {
    expect(paymentFrom(event("payment.succeeded", { id: "pay_alt" }))?.dodoPaymentId).toBe("pay_alt");
  });

  it("returns null with no identifier at all — an unkeyed payment cannot upsert", () => {
    expect(paymentFrom(event("payment.succeeded", { total_amount: 999 }))).toBeNull();
  });

  it("ignores an offer in metadata that is not one of ours", () => {
    const parsed = paymentFrom(
      event("payment.succeeded", { payment_id: "p", metadata: { offer: "enterprise" } }),
    );
    expect(parsed?.declaredOffer).toBeNull();
  });

  it("reads an amount sent as a string", () => {
    const parsed = paymentFrom(event("payment.succeeded", { payment_id: "p", total_amount: "999" }));
    expect(parsed?.totalMinor).toBe(999);
  });

  it("falls back to zero on an unreadable amount rather than dropping the payment", () => {
    // Documented consequence: the row is labelled `free`. The license key is
    // issued by Dodo regardless, so the cost is a wrong label and a wrong email
    // subject — not a free copy. Refusing the payload would be worse.
    const parsed = paymentFrom(event("payment.succeeded", { payment_id: "p", total_amount: -100 }));
    expect(parsed?.totalMinor).toBe(0);
  });
});

describe("resolveOffer", () => {
  // There are no discount codes. The product's price is edited by hand as the
  // launch moves, so the amount that cleared IS the offer.
  const PRICES = { launchMinor: 499, fullMinor: 1499 };

  it("calls a zero total free whatever the metadata claims", () => {
    expect(resolveOffer({ ...PRICES, totalMinor: 0, declaredOffer: "full" })).toBe("free");
  });

  it("labels each listed price", () => {
    expect(resolveOffer({ ...PRICES, totalMinor: 499 })).toBe("launch");
    expect(resolveOffer({ ...PRICES, totalMinor: 1499 })).toBe("full");
  });

  it("trusts what the page said it was selling for a price we never listed", () => {
    // Currency conversion and rounding both land here.
    expect(resolveOffer({ ...PRICES, totalMinor: 512, declaredOffer: "launch" })).toBe("launch");
  });

  it("never lets a declared 'free' label a payment that actually charged", () => {
    // The amount is the fact; metadata is a hint a client could have forged.
    expect(resolveOffer({ ...PRICES, totalMinor: 1499, declaredOffer: "free" })).toBe("full");
  });

  it("guesses from the amount when nothing was declared", () => {
    expect(resolveOffer({ ...PRICES, totalMinor: 600 })).toBe("launch");
    expect(resolveOffer({ ...PRICES, totalMinor: 1800 })).toBe("full");
  });
});

describe("refundTargetFrom", () => {
  it("finds the payment on each of the shapes a reversal arrives in", () => {
    expect(refundTargetFrom(event("payment.refunded", { payment_id: "pay_1" }))).toBe("pay_1");
    expect(refundTargetFrom(event("refund.succeeded", { payment: { payment_id: "pay_2" } }))).toBe(
      "pay_2",
    );
    expect(refundTargetFrom(event("dispute.opened", { dispute: { payment_id: "pay_3" } }))).toBe(
      "pay_3",
    );
  });

  it("returns null when the event names no payment", () => {
    expect(refundTargetFrom(event("dispute.opened", { dispute: {} }))).toBeNull();
  });
});

describe("licenseKeyFrom", () => {
  it("reads a nested license_key.created payload", () => {
    const parsed = licenseKeyFrom(
      event("license_key.created", {
        id: "grant_1",
        license_key: {
          id: "lk_1",
          key: "PRO-AAAA-BBBB",
          activations_limit: 3,
          instances_count: 1,
          expires_at: "2027-01-01T00:00:00Z",
        },
      }),
    );
    expect(parsed).toMatchObject({
      key: "PRO-AAAA-BBBB",
      dodoLicenseKeyId: "lk_1",
      activationsLimit: 3,
      activationsUsed: 1,
      grantId: "grant_1",
    });
    expect(parsed?.expiresAt?.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("reads a bare key on an entitlement grant", () => {
    const parsed = licenseKeyFrom(
      event("entitlement_grant.delivered", { grant_id: "grant_2", key: "PRO-CCCC" }),
    );
    expect(parsed?.key).toBe("PRO-CCCC");
    expect(parsed?.grantId).toBe("grant_2");
  });

  it("stores no expiry rather than an Invalid Date", () => {
    const parsed = licenseKeyFrom(
      event("license_key.created", { license_key: { key: "PRO-D", expires_at: "not-a-date" } }),
    );
    expect(parsed?.expiresAt).toBeNull();
  });

  it("reports an unlimited activation limit as null, not zero", () => {
    const parsed = licenseKeyFrom(
      event("license_key.created", { license_key: { key: "PRO-E", activations_limit: null } }),
    );
    expect(parsed?.activationsLimit).toBeNull();
  });

  it("returns null with no key", () => {
    expect(licenseKeyFrom(event("license_key.created", { license_key: { id: "lk_x" } }))).toBeNull();
  });
});

describe("revokedKeyFrom", () => {
  it("finds the key in both revocation shapes", () => {
    expect(revokedKeyFrom(event("license_key.revoked", { license_key: { key: "PRO-A" } }))).toBe(
      "PRO-A",
    );
    expect(revokedKeyFrom(event("entitlement_grant.revoked", { key: "PRO-B" }))).toBe("PRO-B");
  });
});

describe("grantStatusFor", () => {
  it("maps the three grant events and nothing else", () => {
    expect(grantStatusFor("entitlement_grant.created")).toBe("pending");
    expect(grantStatusFor("entitlement_grant.delivered")).toBe("delivered");
    expect(grantStatusFor("entitlement_grant.revoked")).toBe("revoked");
    expect(grantStatusFor("payment.succeeded")).toBeNull();
  });
});

describe("isHandled", () => {
  it("covers every event the switch has a case for", () => {
    for (const type of [
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
    ]) {
      expect(isHandled(type)).toBe(true);
    }
  });

  it("does not claim events we ignore", () => {
    expect(isHandled("subscription.active")).toBe(false);
    expect(isHandled("")).toBe(false);
  });
});
