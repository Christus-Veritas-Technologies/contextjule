/**
 * The checkout session id, kept across the redirect to Dodo and back.
 *
 * The thanks page needs it to ask "is my key ready yet". Dodo's return URL does
 * carry query parameters, but which ones varies, and a page that only works
 * when a third party sends the right parameter is a page that breaks quietly
 * six months from now. This is the copy we control.
 *
 * sessionStorage rather than localStorage on purpose: it is scoped to the tab
 * that started the purchase and disappears when that tab does, which is exactly
 * the lifetime of the thing it describes.
 */
const KEY = "contextjule:checkout-session";

export function rememberCheckout(sessionId: string): void {
  try {
    sessionStorage.setItem(KEY, sessionId);
  } catch {
    // Private browsing, or storage disabled. The email still carries the key,
    // so this is a degraded experience rather than a broken purchase.
  }
}

export function recallCheckout(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/**
 * Has this purchase already been reported to analytics?
 *
 * Returns true the first time it is asked about a given id, false forever
 * after. The thanks page is a plain URL a buyer can refresh, bookmark or open
 * in a second tab, and GA4 does de-duplicate `purchase` by `transaction_id` —
 * but only within a window, and only if the id is actually set. This is the
 * cheap belt to that braces.
 *
 * localStorage rather than sessionStorage: a new tab is exactly the case this
 * has to survive, and a sessionStorage guard is scoped to the tab that misses
 * it.
 */
export function claimPurchaseReport(transactionId: string): boolean {
  const key = `contextjule:reported:${transactionId}`;
  try {
    if (localStorage.getItem(key)) return false;
    localStorage.setItem(key, "1");
    return true;
  } catch {
    // Storage disabled. Reporting once per page view beats never reporting.
    return true;
  }
}
