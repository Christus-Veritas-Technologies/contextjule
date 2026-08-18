import { env } from "@contextjule/env/server";
import prisma from "@contextjule/db";

import { dodo, DODO_PUBLIC_BASE } from "./dodo";
import { mailTransport } from "./mailer";

/**
 * Prove the credentials work, at boot, before a customer does it for us.
 *
 * Every one of these fails silently otherwise, and each failure surfaces at the
 * worst possible moment: a bad SMTP password shows up as a purchase email that
 * never arrives; a Dodo key from the wrong environment shows up as a checkout
 * that 401s at the till; a product id typo shows up as a session that cannot be
 * created. All three are invisible until money is involved.
 *
 * Deliberately does NOT exit on failure. A server that refuses to boot because
 * SMTP is briefly down also takes down licence validation for every existing
 * customer, which is a far worse outage than "new purchase emails are delayed".
 * Loud logs, healthy process — and `/health` still answers so the platform can
 * tell the difference between "misconfigured" and "dead".
 */

type Outcome = { ok: boolean; detail: string };

async function checkDatabase(): Promise<Outcome> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const promo = await prisma.promo.findUnique({ where: { slug: "launch" } });
    return {
      ok: true,
      detail: promo
        ? `connected · promo ${promo.freeClaimed}/${promo.freeLimit} claimed`
        : "connected · no promo row yet (created on first /api/promo read)",
    };
  } catch (error) {
    return { ok: false, detail: message(error) };
  }
}

/**
 * One call that proves three things at once: the API key is valid, it belongs
 * to the environment we think it does, and the product id actually exists in
 * that environment. Checking the key alone would still let a live-mode key and
 * a test-mode product id sail through.
 */
async function checkDodo(): Promise<Outcome> {
  if (!env.DODO_API_KEY) return { ok: false, detail: "DODO_API_KEY is not set" };
  if (!env.DODO_PRODUCT_ID) return { ok: false, detail: "DODO_PRODUCT_ID is not set" };

  try {
    const product = (await dodo.products.retrieve(env.DODO_PRODUCT_ID)) as {
      name?: string;
      price?: { price?: number } | number;
      is_recurring?: boolean;
    };

    // The price is what the launch phase is charging, so surfacing it here
    // turns "did I remember to change the price in Dodo" into something the
    // boot log answers.
    const raw = typeof product.price === "object" ? product.price?.price : product.price;
    const price = typeof raw === "number" ? `${(raw / 100).toFixed(2)} USD` : "price unreadable";

    return {
      ok: true,
      detail: `${env.DODO_ENVIRONMENT} · "${product.name ?? "unnamed"}" · ${price}`,
    };
  } catch (error) {
    const status = statusOf(error);
    if (status === 401 || status === 403) {
      return { ok: false, detail: `key rejected (${status}) — wrong key, or wrong environment` };
    }
    if (status === 404) {
      return {
        ok: false,
        detail: `product ${env.DODO_PRODUCT_ID} not found in ${env.DODO_ENVIRONMENT}`,
      };
    }
    return { ok: false, detail: message(error) };
  }
}

async function checkSmtp(): Promise<Outcome> {
  if (env.EMAIL_DRY_RUN) {
    return { ok: true, detail: "dry run — printing instead of sending, nothing to verify" };
  }

  const transport = mailTransport();
  if (!transport) {
    return { ok: false, detail: "SMTP_HOST / SMTP_USER / SMTP_PASSWORD are not all set" };
  }

  try {
    await transport.verify();
    return { ok: true, detail: `${env.SMTP_HOST}:${env.SMTP_PORT} as ${env.SMTP_USER}` };
  } catch (error) {
    return { ok: false, detail: message(error) };
  }
}

function checkSigning(): Outcome {
  const problems: string[] = [];
  if (!env.ADMIN_TOKEN) problems.push("ADMIN_TOKEN unset — POST /api/releases will 503");
  if (!env.ARTIFACT_BASE_URL) {
    problems.push("ARTIFACT_BASE_URL unset — downloads stream through this server");
  }
  return problems.length === 0
    ? { ok: true, detail: "admin token set, artifacts served from storage" }
    : { ok: true, detail: problems.join("; ") };
}

export async function preflight(): Promise<void> {
  const started = Date.now();

  // Run them together: three sequential network round trips would add a second
  // or more to every cold start, and none of them depends on another.
  const [database, dodoCheck, smtp] = await Promise.all([
    checkDatabase(),
    checkDodo(),
    checkSmtp(),
  ]);
  const signing = checkSigning();

  const rows: Array<[string, Outcome]> = [
    ["database", database],
    ["dodo", dodoCheck],
    ["smtp", smtp],
    ["publishing", signing],
  ];

  const failed = rows.filter(([, outcome]) => !outcome.ok);

  console.info(
    [
      "",
      `┌─ contextjule api · preflight (${Date.now() - started}ms)`,
      ...rows.map(([name, o]) => `│  ${o.ok ? "ok  " : "FAIL"}  ${name.padEnd(11)} ${o.detail}`),
      `│  ok    ${"dodo public".padEnd(11)} ${DODO_PUBLIC_BASE}`,
      `│  ok    ${"cors".padEnd(11)} ${env.CORS_ORIGIN}`,
      failed.length === 0
        ? "└─ all good"
        : `└─ ${failed.length} problem(s): ${failed.map(([n]) => n).join(", ")} — serving anyway`,
      "",
    ].join("\n"),
  );
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function statusOf(error: unknown): number | null {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status: unknown }).status;
    if (typeof status === "number") return status;
  }
  return null;
}
