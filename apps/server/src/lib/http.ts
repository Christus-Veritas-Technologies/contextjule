import type { Context } from "hono";

/** A failure the client is allowed to see the reason for. */
export class ApiError extends Error {
  constructor(
    readonly status: 400 | 401 | 403 | 404 | 409 | 410 | 422 | 429 | 500,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function badRequest(code: string, message: string) {
  return new ApiError(400, code, message);
}
export function notFound(code: string, message: string) {
  return new ApiError(404, code, message);
}
export function gone(code: string, message: string) {
  return new ApiError(410, code, message);
}
export function tooMany(code: string, message: string) {
  return new ApiError(429, code, message);
}

/** The caller's address, trusting the proxy header only when one is present. */
export function clientIp(c: Context): string | undefined {
  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim();
  return c.req.header("cf-connecting-ip") ?? c.req.header("x-real-ip") ?? undefined;
}
