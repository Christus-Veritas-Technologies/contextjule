# contextjule

A desktop pet that reads your AI context window. Read `designs/README.md` before
changing anything visual — it is the specification, not a mood board.

## The shape of the repo

    apps/desktop     Tauri v2 + React + TanStack Router. The product.
    apps/web         Next.js. The marketing site and checkout.
    apps/server      Hono on Bun. Dodo Payments, licensing, gated downloads.
    packages/core    Framework-free domain model. Load states, pricing, licensing.
    packages/ui      shadcn/ui primitives restyled to the design system, plus
                     the ContextJule components and the sprite engine.
    packages/db      Prisma schema and client.
    packages/env     Validated environment, split server/web.
    packages/config  Shared tsconfig base.
    designs/         The design archive. Read-only. See below.

## Rules that are not negotiable

**Nothing about a session leaves the machine.** The desktop app reads context
length locally and stores sessions, tokens and settings in a local SQLite file.
`packages/db` and `apps/server` hold payments and licensing only — there is no
table here that could contain a customer's prompt, and there should never be one.

**The design system is fixed.** From `designs/README.md`: Silkscreen for all UI
type, Space Grotesk for body copy. Gold `#f0b13f` is the only primary and appears
once per screen. Every border is 3px. Every shadow is a hard offset — never a
blur, never a glow. Nothing is rounded. No gradients except the sky-and-grass
scene. There is no dark mode; `data-band` re-tones a surface instead.

**Sprites scale by whole numbers only.** Nearest-neighbour, never fractional,
never smoothed. Frames are 30x40 at 1x and aligned bottom-centre — anchor the
bottom edge to the ground line or she floats.

**`designs/` is read-only.** `designs/source/jule-sprite.js` is the only file in
that archive that cannot be regenerated from something else. `packages/ui` holds
a verbatim copy at `src/jule/engine.js`; run `pnpm sync:sprite` to re-copy it
after a change to the original, and never edit the copy directly.

## What runs where

The desktop app has two databases and they must never be confused:

    packages/db          PostgreSQL, on our server. Payments and licensing only.
                         There is no table here that could hold a prompt.
    src-tauri/store.rs   SQLite, on the customer's machine, compiled into the
                         binary via `rusqlite/bundled`. Sessions, token counts,
                         settings, unlocks. It never leaves the device.

`reqwest` appears in exactly one file — `src-tauri/src/license.rs` — and that is
the whole of the app's outbound network surface. A licence check sends a key, a
machine id and a device name. If you find yourself adding an HTTP call anywhere
else in that crate, stop and reread this paragraph.

SQL does not cross the IPC boundary. The webview calls typed commands in
`lib.rs` and gets typed rows back, so the local schema can change without
touching TypeScript and the frontend cannot be talked into running a query.

## Licensing, and what Dodo actually returns

    POST /licenses/activate  →  the instance, plus product and customer.
                                403 inactive · 404 unknown · 422 limit reached.
    POST /licenses/validate  →  { "valid": boolean }. That is the entire body.

Activate can explain itself; validate cannot. That asymmetry is why the app
calls our API first: the backend merges Dodo's verdict with the mirrored
`LicenseKey` row the webhooks keep current, so a locked app can say *why*.
Dodo stays the authority — we never override its `valid`.

Three tiers, and the app stays usable through all of them: our API (rich
answer), Dodo direct (`valid` only), then the cached row inside its seven-day
grace window. Only a definitive `valid: false` locks anything. A paying
customer on a plane keeps working.

## The four surfaces

The desktop app ships four windows, and only one of them has chrome. They are
declared in `apps/desktop/src-tauri/tauri.conf.json` and each loads its own
route:

    main         420 x 600   /            the four screens, with title bar and tabs
    panel        320 x 450   /panel       compact: the scene, a gauge, two buttons
    mini-bar     300 x 86    /mini-bar    always on top; 380 x 116 at heavy/crashed
    tray-flyout  280 x 132   /tray        anchored to the tray icon, dismisses on blur
    overlay      120 x 160   /overlay     transparent, click-through, no chrome at all

Only `main` is visible at launch; the rest are created hidden and shown on
demand. The chrome lives in the pathless `_app` layout route, which is why the
compact surfaces sit at the top level of `src/routes` — they must render nothing
but themselves.

`/speech` is a reference sheet, not a shipping surface: every speech tone against
the pose it is drawn with, reachable in `pnpm dev:frontend`.

Screen values — positions, fills, copy — come from `designs/screens/*.html`. Where
a design sheet hand-sets a number the domain model would compute differently (the
home meter reads four segments where 42,180 tokens computes to three), the screen
passes an explicit override and the model keeps its own behaviour. Look for
`filled`, `accent` and `fraction` props.

## Payments and licensing

Dodo Payments is the only processor and the only issuer of license keys.

There is **one product and three offers**, and all three are the same checkout
with a different discount code: `full` (no code), `launch` (a capped percentage
code) and `free` (a 100% code with a usage limit). This matters — a free
promotional copy still goes through checkout, still creates a customer and a
payment row of zero, and still gets a real license key. So the app's unlock check
never has to know whether someone paid, and there is only ever one delivery path
to protect.

The download link in a purchase email is a single-use-ish expiring token, and it
protects bandwidth, not the product. **The license key is the gate.**

Webhooks are idempotent on the `webhook-id` header via the `WebhookEvent` table.
Dodo retries on any non-2xx, so a handler that cannot do its work returns 500 and
one that does not recognise the event returns 200.

## Working here

    pnpm db:up          local Postgres in Docker (the SERVER database)
    pnpm db:generate    regenerate the Prisma client (required before typecheck)
    pnpm dev            everything
    pnpm dev:desktop    Tauri only
    pnpm lint           Biome

Environment lives in `apps/server/.env` and `apps/web/.env`; both have a
`.env.example` beside them. `packages/db/prisma.config.ts` reads the server one.

## Reading the context window

Not built yet. `docs/adr/0001-reading-the-context-window.md` records the options
and the decision: a pluggable source layer, shipping local CLI transcripts
first (exact, zero friction), then a localhost proxy for API tools, then an
app-owned webview for browser users. Every source emits one `Reading`, which is
the shape `store::session_upsert` already takes — so nothing above the source
layer changes when a source is added.

Two things are rejected outright and should not be revisited without a reason
the ADR does not already cover: a MITM proxy with a generated root CA, and
reading the number out of the accessibility tree.

## Branches

    feature/*  →  PR  →  dev  →  (tested by hand)  →  PR  →  main

CI runs on pull requests into `main` and on `main` itself. `dev` is the
integration branch you exercise manually, so it is deliberately not gated —
what must never break is `main`, because a push there builds and publishes
signed installers to R2 and moves every existing install's updater target.
