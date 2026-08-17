# Build from the monorepo root: docker build -f apps/server/Dockerfile .
#
# Adapted from already-deployed sibling projects sharing this exact stack (pnpm workspaces +
# `catalog:` protocol, Bun runtime, Hono, Prisma 7, a real "build": "tsdown" script and a
# "start": "bun run dist/index.mjs"). Those repos hit real failures deploying this pattern; the
# fixes are carried forward even where the reasoning isn't obvious from this codebase alone.
#
# One deliberate omission from the references: their headless-Chromium and canvas-font package
# lists are gone. Those existed for whatsapp-web.js and @napi-rs/canvas; this server renders no
# images and drives no browser, and thirty unused shared libraries would triple the image for
# nothing. Everything else is kept as-is.
FROM oven/bun:1

WORKDIR /app

# openssl/ca-certificates: Prisma's query engine + TLS to a managed Postgres (Neon/Supabase/RDS
# with sslmode=require, etc.). curl: fetches the pnpm standalone installer below.
# libatomic1: the pnpm standalone installer is a compiled glibc build that dynamically links
# libatomic, which isn't installed by default on this image ("libatomic.so.1: cannot open shared
# object file" otherwise).
RUN apt-get update -y \
  && apt-get install -y openssl ca-certificates curl libatomic1 \
  && rm -rf /var/lib/apt/lists/*

# Bun is the runtime, but installs go through pnpm. pnpm-workspace.yaml uses the `catalog:`
# protocol for shared dependency versions (zod, typescript, dotenv, ...), which `bun install`
# doesn't resolve the same way pnpm's workspace linker does.
#
# `bun install -g pnpm` runs pnpm's CLI under Bun's own JS engine, and pnpm 11's lockfile/store
# code imports `node:sqlite`, a Node built-in this Bun version doesn't implement yet ("error: No
# such built-in module: node:sqlite"). pnpm's standalone installer ships its own self-contained
# Node runtime, sidestepping Bun entirely for this one step.
#
# The installer puts the binary in $PNPM_HOME/bin, not $PNPM_HOME itself — missing /bin here is
# exactly what makes the next step fail with "pnpm: not found".
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
# The installer's post-install step runs `pnpm setup`, which tries to detect the calling shell to
# patch its profile file — `docker build`'s /bin/sh -c has no $SHELL set, so it fails with
# ERR_PNPM_UNKNOWN_SHELL. PNPM_HOME/PATH are already set above; the shell just needs to exist,
# not be "right".
ENV SHELL=/bin/bash
# `pnpm --version` at the end makes this step fail fast, at this line, with a clear error if the
# binary still isn't reachable — instead of surfacing as a confusing "pnpm: not found" later.
RUN curl -fsSL https://get.pnpm.io/install.sh | env PNPM_VERSION=11.4.0 sh - \
  && pnpm --version

# Some platforms (Coolify and similar) inject NODE_ENV=production as a build-time variable; pnpm
# treats that the same as `--prod` and silently skips devDependencies — which would drop tsdown,
# typescript and the prisma CLI, all needed below. Forced back until the runtime ENV near the
# bottom.
ENV NODE_ENV=development

# Manifests + lockfile first, for layer caching. apps/server needs @contextjule/env (runtime),
# @contextjule/core (pricing, promo phases, licensing schemas), @contextjule/db (Prisma client +
# schema) and @contextjule/config (tsconfig base) — the web and desktop apps are left out of this
# image on purpose.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/config/package.json packages/config/
COPY packages/core/package.json packages/core/
COPY packages/env/package.json packages/env/
COPY packages/db/package.json packages/db/
COPY apps/server/package.json apps/server/

# packages/db/package.json has "postinstall": "prisma generate", which pnpm runs automatically as
# part of `pnpm install` below — before the "source after install" copy further down would
# otherwise land the schema. Without the schema present at install time, that postinstall fails
# with "Could not find Prisma Schema" and takes the whole install down with it. Bring just the
# schema + prisma.config.ts in now (cheap, and these change far less often than application code,
# so this barely dents layer-cache reuse).
COPY packages/db/prisma.config.ts packages/db/
COPY packages/db/prisma/ packages/db/prisma/

# prisma.config.ts reads DATABASE_URL through prisma/config's `env()` helper, which throws if the
# variable is missing entirely — so even `prisma generate`, which never touches a real database,
# fails at build time without *something* set here. Pass the real value at container start (along
# with the Dodo keys, the SMTP credentials and the signing secrets, which have no build-time
# dependency and are only validated at startup) — this build-time default is a dummy.
#
# prisma.config.ts also dotenv-loads ../../apps/server/.env. That file is not in this image by
# design; dotenv ignores a missing path, so the value above is what applies.
ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV DATABASE_URL=${DATABASE_URL}

# allowBuilds in pnpm-workspace.yaml already approves the postinstall/build scripts this repo
# needs (esbuild, sharp, prisma, @prisma/engines) — no extra flags needed for pnpm to run them.
RUN pnpm install --frozen-lockfile

# Source after install for better layer caching.
COPY packages/config/ packages/config/
COPY packages/core/ packages/core/
COPY packages/env/ packages/env/
COPY packages/db/ packages/db/
COPY apps/server/ apps/server/

RUN pnpm --filter @contextjule/db db:generate
RUN pnpm --filter server build

ENV NODE_ENV=production
ENV PORT=3000
ENV CORS_ORIGIN=http://localhost:3001
EXPOSE 3000

WORKDIR /app/apps/server

# `db:migrate:deploy` (not "db:migrate", which is `prisma migrate dev` — interactive and dev-only,
# unsuitable here) applies any migrations in packages/db/prisma/migrations/ that haven't been
# recorded as applied yet, before the server starts taking traffic. It only applies un-applied
# files, so it is a no-op once everything is current and safe to run on every restart.
#
# This runs at container *startup*, not build time, on purpose: it needs the real DATABASE_URL
# (your platform injects it at runtime, not the "build:build@localhost" placeholder ARG'd in
# above) and needs to be on the same network as the database, which only the running container is
# guaranteed to be.
#
# `exec` replaces the shell with the bun process so it keeps receiving signals (e.g. SIGTERM)
# directly for a clean shutdown, instead of them going to the shell.
CMD ["sh", "-c", "cd /app/packages/db && pnpm run db:migrate:deploy && cd /app/apps/server && exec bun run dist/index.mjs"]
