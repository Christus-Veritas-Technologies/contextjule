# Build from the monorepo root: docker build -f apps/web/Dockerfile .
#
# Adapted from already-deployed sibling projects on this same stack and monorepo shape (pnpm
# workspaces using the `catalog:` protocol, a Next.js app fed by shared packages/). Those repos
# hit real failures deploying this exact pattern; the fixes are carried forward here even where
# the reasoning isn't visible from this codebase alone. Each is commented rather than left to
# look like cruft.
#
# Differences from the references:
#
#   1. No `.npmrc` is copied — this repo doesn't have one. The references that copy it needed
#      node-linker=isolated; here the default layout is what the app is developed against.
#   2. packages/core is copied as well as packages/ui. apps/web imports @contextjule/core
#      directly (pricing, promo, format) and @contextjule/ui depends on it too, so leaving it
#      out fails on a module resolution error rather than anything naming the real cause.
#   3. packages/db and apps/desktop are never copied. The site has no database dependency, and
#      the Tauri app would drag a Rust toolchain's worth of context into a build that never
#      touches it.
FROM node:22-slim AS builder

WORKDIR /app

# corepack rather than `npm install -g pnpm@11`: package.json pins packageManager to pnpm@11.4.0,
# and a floating `@11` can resolve to a newer patch than the one that wrote pnpm-lock.yaml, which
# makes --frozen-lockfile fail for no useful reason.
RUN corepack enable && corepack prepare pnpm@11.4.0 --activate

# Some platforms (Coolify, Dokku and similar) inject NODE_ENV=production as a *build-time*
# variable. pnpm reads that the same as `--prod` and silently skips devDependencies — here that
# would drop typescript, tailwindcss and @tailwindcss/postcss, all of which `next build` needs.
#
# Scoped to the install step only, and flipped back to production before `next build` below:
# leaving it as development through the build makes Next warn about a non-standard NODE_ENV and
# then fail prerendering /_global-error, because the build runs against React's development
# bundle. NODE_ENV only affects what pnpm *installs*, so switching it afterwards is safe —
# devDependencies are already on disk by then.
ENV NODE_ENV=development

# Workspace manifests + lockfile first, so the install layer survives source edits.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/config/package.json packages/config/
COPY packages/core/package.json packages/core/
COPY packages/env/package.json packages/env/
COPY packages/ui/package.json packages/ui/
COPY apps/web/package.json apps/web/

# NEXT_PUBLIC_SERVER_URL (packages/env/src/web.ts) is read at the top of next.config.ts
# (`import "@contextjule/env/web"`) and baked into the client bundle at build time — it is NOT
# read at container runtime, and it's required (env-nextjs throws if missing), so `next build`
# fails without it. It MUST be provided at build time, not just as a runtime env.
# Override via: --build-arg NEXT_PUBLIC_SERVER_URL=https://api.contextjule.com
#
# It is deliberately the only build arg here. Prices and the launch phase used to live in this
# file as NEXT_PUBLIC_* vars and are now served by the API at runtime, so a rebuild is no longer
# needed to change what the page charges.
ARG NEXT_PUBLIC_SERVER_URL=http://localhost:3000
ENV NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL}
ENV NEXT_TELEMETRY_DISABLED=1

# `--filter web...` installs the site and everything it depends on, and nothing else. It is not
# just an optimisation here: packages/db has a "postinstall": "prisma generate", and a plain
# install would run it against a schema this image never copies, failing with "Could not find
# Prisma Schema" and taking the whole install down with it.
RUN pnpm install --frozen-lockfile --filter web...

# Source after install for better layer caching.
COPY packages/config/ packages/config/
COPY packages/core/ packages/core/
COPY packages/env/ packages/env/
COPY packages/ui/ packages/ui/
COPY apps/web/ apps/web/

# Back to production for the build itself — see the NODE_ENV note above.
ENV NODE_ENV=production

RUN pnpm --filter web build

# ---- Runner ----
FROM node:22-slim AS runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.4.0 --activate

# next.config.ts doesn't set `output: "standalone"`, so `next start` needs the full node_modules
# tree rather than a pruned bundle — copied wholesale from the builder instead of reinstalled
# here (a fresh `pnpm install --prod` would drop next itself from the workspace links).
#
# packages/ has to come across too, and not only for node_modules symlinks to resolve:
# next.config.ts sets transpilePackages for @contextjule/ui and @contextjule/core, which ship
# TypeScript source rather than a build, so their src/ directories are part of what runs.
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web ./apps/web
COPY --from=builder /app/packages ./packages

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

WORKDIR /app/apps/web

EXPOSE 3001

CMD ["pnpm", "start"]
