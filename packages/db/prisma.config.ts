import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * The server's .env is the single place the database URL is written, and this
 * package reads it rather than keeping a second copy that can drift.
 *
 * Anchored to this file rather than the working directory. It used to be the
 * relative string "../../apps/server/.env", which only resolved because pnpm
 * happens to run package scripts from the package directory — run the same
 * command from the repo root by hand and it silently loaded nothing.
 */
dotenv.config({ path: path.join(here, "..", "..", "apps", "server", ".env") });

/**
 * `prisma generate` reads the schema and writes a client. It never opens a
 * connection — but Prisma loads this config for every command, and asking for
 * DATABASE_URL here throws the moment it is missing.
 *
 * That is what took CI down: `packages/db` has a `postinstall: prisma generate`,
 * so `pnpm install --frozen-lockfile` failed on a runner that has no database
 * and no .env, before a single check had run. The same hole is why the
 * Dockerfile carries a dummy DATABASE_URL build arg.
 *
 * So the requirement is scoped to the commands that actually need it. The
 * placeholder handed to `generate` is deliberately unusable rather than a
 * plausible localhost URL: if it ever does reach a connection, it should fail
 * loudly instead of quietly migrating whatever happens to be running locally —
 * which has already cost us once, when a promo reset landed on a dev database
 * instead of production.
 */
const GENERATE_ONLY_PLACEHOLDER = "postgresql://unset:unset@0.0.0.0:1/unset";

function datasourceUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url) return url;
  if (process.argv.includes("generate")) return GENERATE_ONLY_PLACEHOLDER;
  throw new Error(
    "DATABASE_URL is not set. Put it in apps/server/.env, or pass it inline:\n" +
      '  $env:DATABASE_URL="postgres://…"; pnpm --filter @contextjule/db db:migrate:deploy',
  );
}

export default defineConfig({
  schema: path.join("prisma", "schema"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  datasource: {
    url: datasourceUrl(),
  },
});
