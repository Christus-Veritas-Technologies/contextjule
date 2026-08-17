import { beforeAll, describe, expect, it, mock } from "bun:test";

/**
 * The admin token guard, exercised without Hono.
 *
 * `requireAdmin` only ever reads one header and calls `next`, so a two-field
 * stand-in for the context is enough — and it means this runs without a server,
 * a port, or a request.
 */
const CONFIGURED = "a-long-enough-admin-token-for-the-schema";

/**
 * One mutable object, not a getter on the module namespace: `admin.ts` reads
 * `env.ADMIN_TOKEN` at call time, so mutating a property of the object it
 * already holds is what actually changes what it sees.
 */
const state: { ADMIN_TOKEN: string | undefined } = { ADMIN_TOKEN: CONFIGURED };

mock.module("@contextjule/env/server", () => ({ env: state }));

type AdminModule = typeof import("../lib/admin");
type HttpModule = typeof import("../lib/http");

let admin: AdminModule;
let http: HttpModule;

beforeAll(async () => {
  admin = await import("../lib/admin");
  http = await import("../lib/http");
});

function contextWith(authorization?: string) {
  return {
    req: {
      header(name: string) {
        return name.toLowerCase() === "authorization" ? authorization : undefined;
      },
    },
  } as never;
}

async function run(authorization?: string): Promise<{ passed: boolean; error?: unknown }> {
  let passed = false;
  try {
    await admin.requireAdmin(contextWith(authorization), async () => {
      passed = true;
    });
    return { passed };
  } catch (error) {
    return { passed, error };
  }
}

describe("requireAdmin", () => {
  it("lets the configured token through", async () => {
    state.ADMIN_TOKEN = CONFIGURED;
    expect((await run(`Bearer ${CONFIGURED}`)).passed).toBe(true);
  });

  it("rejects a wrong token with 401", async () => {
    state.ADMIN_TOKEN = CONFIGURED;
    const { passed, error } = await run("Bearer not-the-token");
    expect(passed).toBe(false);
    expect(error).toBeInstanceOf(http.ApiError);
    expect((error as InstanceType<HttpModule["ApiError"]>).status).toBe(401);
  });

  it("rejects a token of a different length without throwing a crypto error", async () => {
    // `timingSafeEqual` throws on mismatched buffer lengths. Hashing both sides
    // to a fixed width first is what stops a length mismatch from becoming a
    // 500 — and from leaking the token's length through the status code.
    state.ADMIN_TOKEN = CONFIGURED;
    const { error } = await run("Bearer x");
    expect(error).toBeInstanceOf(http.ApiError);
    expect((error as InstanceType<HttpModule["ApiError"]>).status).toBe(401);
  });

  it("rejects a missing header", async () => {
    state.ADMIN_TOKEN = CONFIGURED;
    expect((await run()).passed).toBe(false);
  });

  it("rejects the raw token without the Bearer prefix", async () => {
    state.ADMIN_TOKEN = CONFIGURED;
    expect((await run(CONFIGURED)).passed).toBe(false);
  });

  it("is case-sensitive about the token itself", async () => {
    state.ADMIN_TOKEN = CONFIGURED;
    expect((await run(`Bearer ${CONFIGURED.toUpperCase()}`)).passed).toBe(false);
  });

  it("refuses everything with 503 when no token is configured", async () => {
    // The dangerous alternative is treating an unset token as "no auth needed",
    // which would leave a fresh deploy publishing releases for anyone.
    state.ADMIN_TOKEN = undefined;
    const { passed, error } = await run("Bearer anything");
    expect(passed).toBe(false);
    expect((error as InstanceType<HttpModule["ApiError"]>).status).toBe(503);
  });

  it("does not accept an empty presented token against an empty configured one", async () => {
    state.ADMIN_TOKEN = "";
    const { passed, error } = await run("Bearer ");
    expect(passed).toBe(false);
    expect((error as InstanceType<HttpModule["ApiError"]>).status).toBe(503);
  });
});
