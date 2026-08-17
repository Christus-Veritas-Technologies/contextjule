# contextjule

A desktop pet that reads your AI context window.

Context length is the one number that decides whether a ChatGPT or Claude session
is going well, and nothing shows it to you. ContextJule turns it into a character.
Jule lives on your desktop, watches how much context your session is carrying, and
visibly carries the weight herself. Click once and she dumps the pack on the floor.

Everything about a session stays on the machine. The app reads session length
locally, never types into your chat, and no session text ever leaves the computer.
One price, no subscription, no account.

## Stack

- **Tauri v2 + React + TanStack Router** — the desktop app
- **Next.js** — the marketing site and checkout
- **Hono on Bun** — the API: Dodo Payments, licensing, gated downloads
- **Prisma + PostgreSQL** — payments and licensing only
- **Tailwind v4 + shadcn/ui** — restyled to the ContextJule design system
- **Turborepo + pnpm** — the monorepo

## Getting started

```bash
pnpm install

cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
# fill in DODO_API_KEY, DODO_WEBHOOK_KEY, DODO_PRODUCT_ID

pnpm db:up          # local Postgres in Docker
pnpm db:generate    # generate the Prisma client
pnpm db:migrate     # create the schema

pnpm dev
```

The site is on http://localhost:3001, the API on http://localhost:3000, and the
desktop app opens in its own window via `pnpm dev:desktop`.

## Layout

```
contextjule/
├── apps/
│   ├── desktop/    Tauri app — the product
│   ├── web/        Marketing site and checkout
│   └── server/     Hono API
├── packages/
│   ├── core/       Load states, pricing, licensing — no framework
│   ├── ui/         Design system, components, sprite engine
│   ├── db/         Prisma schema and client
│   ├── env/        Validated environment
│   └── config/     Shared tsconfig
└── designs/        The design archive — read this first, and do not edit it
```

## Design

`designs/README.md` is the specification. In short: Silkscreen for UI type, Space
Grotesk for body copy, gold `#f0b13f` once per screen, 3px borders, hard offset
shadows, nothing rounded, no dark mode. `AGENTS.md` has the rules that matter when
changing code.

## Payments

Dodo Payments issues the license keys. One product, three offers — full price, a
launch discount, and a free promotion — all the same checkout with a different
discount code, so every copy is issued a real key and there is one delivery path
rather than two. See `AGENTS.md`.

## Scripts

| | |
|---|---|
| `pnpm dev` | everything in development |
| `pnpm build` | build all apps |
| `pnpm lint` / `pnpm lint:fix` | Biome |
| `pnpm check-types` | TypeScript across the workspace |
| `pnpm db:up` / `pnpm db:down` | local Postgres |
| `pnpm db:generate` | regenerate the Prisma client |
| `pnpm db:migrate` | create and apply a migration |
| `pnpm db:studio` | Prisma Studio |
| `pnpm sync:sprite` | re-copy the sprite engine from `designs/source` |
