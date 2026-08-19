/**
 * Read and tune the launch counter, without a deploy.
 *
 * The counter is a database row, not a constant, precisely so a promotion can
 * be adjusted while it is running — the `FREE_LIMIT` in @contextjule/core is
 * only the value a fresh row is created with. This script is the handle on it.
 *
 *   pnpm --filter @contextjule/db promo                 show the current state
 *   pnpm --filter @contextjule/db promo --limit 1       give away one copy
 *   pnpm --filter @contextjule/db promo --reset         back to an untouched run
 *   pnpm --filter @contextjule/db promo --close         end the giveaway now
 *
 * Point it at a different database by setting DATABASE_URL in the environment;
 * it wins over apps/server/.env, which is what dotenv falls back to.
 */
import { promoState } from "@contextjule/core/promo";
import { env } from "@contextjule/env/server";

import prisma from "./index";

const SLUG = "launch";

/**
 * Which database this is about to change, without the password.
 *
 * Printed on every run because the failure it prevents is silent and expensive:
 * DATABASE_URL falls back to apps/server/.env, which points at localhost, so
 * `promo --limit 1` against production looks identical to `promo --limit 1`
 * against your laptop — right up until the live site is still counting down
 * from a hundred an hour later.
 */
function target(): string {
  try {
    const url = new URL(env.DATABASE_URL);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    return `${url.hostname}${url.port ? `:${url.port}` : ""}${url.pathname}${local ? "   ← LOCAL, not production" : ""}`;
  } catch {
    return "unparseable DATABASE_URL";
  }
}

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function value(name: string): number | null {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return null;
  const raw = Number(process.argv[index + 1]);
  if (!Number.isFinite(raw) || raw < 0) {
    throw new Error(`--${name} needs a non-negative number, got ${process.argv[index + 1]}`);
  }
  return Math.floor(raw);
}

async function main() {
  const limit = value("limit");
  const reset = flag("reset");
  const close = flag("close");

  const before = await prisma.promo.findUnique({ where: { slug: SLUG } });
  if (!before) {
    throw new Error(
      `No promo row for "${SLUG}". Run \`pnpm db:seed\`, or hit GET /api/promo once — the API creates it on first read.`,
    );
  }

  if (limit !== null || reset || close) {
    await prisma.promo.update({
      where: { slug: SLUG },
      data: {
        ...(limit !== null ? { freeLimit: limit } : {}),
        // `reset` and `close` are opposites, so `reset` wins if both are passed
        // rather than the two silently fighting over freeClosedAt.
        ...(reset ? { freeClaimed: 0, freeClosedAt: null } : {}),
        ...(close && !reset ? { freeClosedAt: new Date() } : {}),
      },
    });
  }

  const row = await prisma.promo.findUniqueOrThrow({ where: { slug: SLUG } });
  const state = promoState(
    {
      freeLimit: row.freeLimit,
      freeClaimed: row.freeClaimed,
      freeClosedAt: row.freeClosedAt,
      discountWindowMs: row.discountHours * 60 * 60 * 1_000,
    },
    Date.now(),
  );

  // Print the resolved phase, not just the row. The row is the input; the phase
  // is what a visitor actually sees, and they are easy to reason about wrongly.
  console.info(`
  database       ${target()}

  slug           ${row.slug}${row.active ? "" : "   (INACTIVE — list price regardless)"}
  free limit     ${row.freeLimit}
  free claimed   ${row.freeClaimed}
  closed at      ${row.freeClosedAt?.toISOString() ?? "— still running"}
  window         ${row.discountHours}h

  → phase        ${state.phase}
  → price        ${(state.amount / 100).toFixed(2)} USD${
    state.strikeAmount ? `  (was ${(state.strikeAmount / 100).toFixed(2)})` : ""
  }
  → remaining    ${state.freeRemaining}
  → ends         ${state.endsAt ?? "—"}
`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
