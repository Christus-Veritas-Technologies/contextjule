import { beforeAll, describe, expect, it, mock } from "bun:test";

/**
 * `lib/tokens.ts` reads the signing secret from the environment at call time.
 * Stubbing the env module rather than setting process.env keeps the test
 * independent of whether a real `.env` happens to be present — a suite that
 * passes only on a machine with a configured secret is not a test.
 */
mock.module("@contextjule/env/server", () => ({
  env: {
    DOWNLOAD_SIGNING_SECRET: "test-secret-that-is-at-least-32-chars-long",
    SERVER_URL: "https://api.contextjule.com",
    ARTIFACT_BASE_URL: undefined,
  },
}));

type Tokens = typeof import("../lib/tokens");
let tokens: Tokens;

beforeAll(async () => {
  tokens = await import("../lib/tokens");
});

describe("download tokens", () => {
  it("stores only a hash — the plaintext exists once", () => {
    const minted = tokens.mintDownloadToken();
    expect(minted.tokenHash).toBe(tokens.hashToken(minted.token));
    expect(minted.tokenHash).not.toContain(minted.token);
    expect(minted.tokenHash).toHaveLength(64);
  });

  it("mints a URL-safe token with real entropy", () => {
    const minted = tokens.mintDownloadToken();
    expect(minted.token).toMatch(/^[A-Za-z0-9_-]+$/);
    // 32 random bytes in base64url. Short enough for an email, long enough that
    // guessing one is not a strategy.
    expect(minted.token.length).toBeGreaterThanOrEqual(42);
  });

  it("never mints the same token twice", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i += 1) seen.add(tokens.mintDownloadToken().token);
    expect(seen.size).toBe(200);
  });

  it("expires in the future", () => {
    expect(tokens.mintDownloadToken().expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});

describe("signed artifact URLs", () => {
  const KEY = "ContextJule-Setup.exe";

  function parts(url: string) {
    const parsed = new URL(url);
    return {
      expires: parsed.searchParams.get("expires") ?? undefined,
      signature: parsed.searchParams.get("signature") ?? undefined,
    };
  }

  it("verifies a URL it just signed", () => {
    const { expires, signature } = parts(tokens.signArtifactUrl(KEY));
    expect(tokens.verifyArtifactUrl(KEY, expires, signature)).toBe(true);
  });

  it("rejects the same signature against a different artifact", () => {
    // The whole point of signing the key alongside the expiry: one valid link
    // must not become a valid link to every file in the bucket.
    const { expires, signature } = parts(tokens.signArtifactUrl(KEY));
    expect(tokens.verifyArtifactUrl("ContextJule.dmg", expires, signature)).toBe(false);
  });

  it("rejects an extended expiry", () => {
    const { expires, signature } = parts(tokens.signArtifactUrl(KEY));
    const later = String(Number(expires) + 60_000);
    expect(tokens.verifyArtifactUrl(KEY, later, signature)).toBe(false);
  });

  it("rejects an expired link even when the signature is genuine", () => {
    const { expires, signature } = parts(tokens.signArtifactUrl(KEY, -1_000));
    expect(expires).toBeDefined();
    expect(tokens.verifyArtifactUrl(KEY, expires, signature)).toBe(false);
  });

  it("rejects a tampered signature", () => {
    const { expires, signature } = parts(tokens.signArtifactUrl(KEY));
    const flipped = `${signature!.slice(0, -1)}${signature!.endsWith("A") ? "B" : "A"}`;
    expect(tokens.verifyArtifactUrl(KEY, expires, flipped)).toBe(false);
  });

  it("rejects a signature of the wrong length without throwing", () => {
    // `timingSafeEqual` throws on mismatched lengths; the length check has to
    // come first or a truncated query string is a 500 instead of a 410.
    const { expires } = parts(tokens.signArtifactUrl(KEY));
    expect(tokens.verifyArtifactUrl(KEY, expires, "short")).toBe(false);
  });

  it("rejects missing parameters", () => {
    expect(tokens.verifyArtifactUrl(KEY, undefined, undefined)).toBe(false);
    expect(tokens.verifyArtifactUrl(KEY, "not-a-number", "sig")).toBe(false);
  });

  it("puts the artifact key in the path, not just the signature", () => {
    const url = new URL(tokens.signArtifactUrl(KEY));
    expect(url.pathname.endsWith(`/${KEY}`)).toBe(true);
    expect(url.origin).toBe("https://api.contextjule.com");
  });

  it("does not double up slashes when the key is already absolute", () => {
    const url = new URL(tokens.signArtifactUrl("/ContextJule.dmg"));
    expect(url.pathname).not.toContain("//");
  });
});
