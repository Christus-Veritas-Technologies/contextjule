/**
 * Token counts read as `3.1k`, `48.2k`, `1.4M` — never as raw digits, except on
 * the home meter where the full number is the point.
 */
export function formatTokens(tokens: number): string {
  if (!Number.isFinite(tokens) || tokens < 0) return "—";
  if (tokens < 1_000) return `${Math.round(tokens)}`;
  if (tokens < 1_000_000) {
    const k = tokens / 1_000;
    return `${k < 100 ? k.toFixed(1) : Math.round(k)}k`;
  }
  const m = tokens / 1_000_000;
  return `${m < 100 ? m.toFixed(1) : Math.round(m)}M`;
}

/** `42,180` — grouped, for the one place the exact number is shown. */
export function formatTokensExact(tokens: number): string {
  return Math.max(0, Math.round(tokens)).toLocaleString("en-US");
}

/** `1h 12m in` — how long this session has been running. */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "0m";
  const minutes = Math.floor(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes % 60}m`;
}

/** `104 hours together` — the growth screen's headline unit. */
export function formatHours(ms: number): string {
  const hours = Math.floor(Math.max(0, ms) / 3_600_000);
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

/** Prices arrive from Dodo Payments in minor units. */
export function formatPrice(minorUnits: number, currency = "USD", locale = "en-US"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(minorUnits / 100);
}
