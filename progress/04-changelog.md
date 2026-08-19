# Changelog

Newest first. This is where the **reasoning** lives — git has the file list.

---

## Session 13 — she was never reading anything

**The transcript readers had never been run.** `sources/mod.rs` said so in a
comment at the top of the file: `status()` was called — which is why the
settings screen listed both readers and their directories quite happily — and
`poll_all` never was. The only thing that ever wrote a reading was
`statusline.rs`. So with the status line uninstalled she watched nothing, while
the growth screen kept showing 104 hours and 1.4M tokens from rows already in
the database. A bug that presents as *old data fine, new data absent* is almost
always a writer that stopped, not a reader that broke.

`spawn_source_readers` in `lib.rs` closes it: one thread polls every source
every two seconds, a second thread folds each `Reading` into the same
`session_upsert` the status line uses and emits `session-updated`. The frontend
already listened for that event (`useSessionEvents` in `lib/data.ts`) and had
been listening to silence.

Two threads rather than one because the reader does blocking file I/O and must
never hold the SQLite lock. The writer batches a poll's readings so five moving
sessions wake the five windows once, not twenty-five times. Both paths key on
`claude-code:<session-id>`, so the status line and the transcript converge on
one row instead of racing for two — which is also why `CONFIDENCE_EXACT` still
has no caller.

**Not a bug: the Claude desktop app.** These readers tail
`~/.claude/projects/*.jsonl` (Claude Code) and `~/.codex/sessions/` (Codex).
The Claude *desktop app* keeps its conversations server-side and writes no
transcript, so there is nothing on disk to read. Worth saying on the sources
screen before someone else spends an evening on it.

**`routeTree.gen.ts` is no longer gitignored.** `pnpm build` runs `tsc --noEmit`
*before* vite, and only vite's router plugin writes that file — so on a clean
checkout tsc failed with `Cannot find module './routeTree.gen'` plus one error
per route, and the desktop release died in `beforeBuildCommand`. It passed here
because the file exists on this machine. TanStack's guidance is to commit it.

---

## Session 12 — two packages are called `contextjule`

**`pnpm --filter contextjule exec tauri build` matched two projects.**
`apps/desktop` is named `contextjule`, and so is the workspace root. pnpm ran
the command in both; the root has no `tauri` on its PATH, so the job died with
*Command "tauri" not found — Did you mean pnpm exec turbo?*. That suggestion is
the tell: `turbo` is a **root** bin, so the shell it was complaining about was
never `apps/desktop`. On Windows both halves ran and the log interleaved a
working tauri build with a cmd-level `'tauri' is not recognized`, which reads
like a broken install and is not one.

Fixed by naming the directory instead of the package:
`working-directory: apps/desktop` + `pnpm exec tauri build`. The root package
is still called `contextjule` — rename it if this bites a third time.

Verified before pushing this time, in a Linux container with the real
lockfile: `pnpm install --frozen-lockfile` links `tauri` into
`apps/desktop/node_modules/.bin` exactly as expected, and the whole
beforeBuildCommand — `tsc --noEmit && vite build` — passes clean. The Rust
side is what is still unproven end to end.

**Still open:** `tauri.conf.json` sets the bundle identifier to
`com.contextjule.app`, and tauri warns on every build that ending an
identifier in `.app` collides with the macOS application bundle extension.
Nothing has shipped, so changing it now costs one local database; changing it
after release orphans every customer's.

---

## Session 11 — the release workflow was never a valid file

**`if: ${{ secrets.R2_ACCOUNT_ID != '' }}` is not a failing step, it is a
rejected file.** GitHub does not expose the `secrets` context to a step-level
`if`, so the parser stops at line 167 with *Unrecognized named-value:
'secrets'* and refuses to run **any** job in the workflow — Windows and macOS
builds included. Session 4 found this exact line and it came back; the tell is
an `Invalid workflow file` annotation with no job logs underneath, which reads
nothing like a build failure and is easy to skim past.

Fixed by hoisting the secret to job-level `env` and testing
`if: env.R2_ACCOUNT_ID != ''`. `env` *is* in the context list for a step `if`.
The workflow now passes `actionlint` clean.

**`pnpm db:generate` failed for the same reason `pnpm install` did, one layer
further in.** Turbo runs tasks in a sanitised environment, so the
`DATABASE_URL` set on the workflow step never reached `prisma generate`.
Nothing extra was needed in the end: the `prisma.config.ts` change already
sitting unmerged on local `main` scopes the requirement to the commands that
actually open a connection and hands `generate` a deliberately unusable
placeholder. Merging main is the fix; the workflow env var is now belt and
braces.

**`ci.yml` deleted.** Nothing else runs `cargo fmt --check` or
`clippy -D warnings` now, so neither will tell you when it drifts. Run them by
hand before a release or accept that the first thing to notice will be a
forty-minute Tauri build.

---

## Session 10 — the first CI run on main, and what it found

**`pnpm install --frozen-lockfile` had never been run without a `.env` beside
it.** `packages/db` carries `postinstall: prisma generate`, and
`prisma.config.ts` reads `DATABASE_URL` through `prisma/config`'s `env()`
helper, which throws outright when the variable is unset — it does not fall
back to undefined. So the install step died before a single check ran, with
`PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL`.

The Dockerfile already had this exact trap written down and solved (a dummy
`ARG DATABASE_URL` before `pnpm install`). CI never got the same treatment
because the `Generate Prisma client` step — which does set it — looks like it
is the first thing that needs it. It is not: the postinstall runs one step
earlier. Fixed in both workflows, not just `ci.yml`; `release-desktop.yml`
installs the same way and would have failed identically on its first run.

**`use std::sync::mpsc` in `lib.rs` was a leftover** from before the status
line moved to `sources/mod.rs` — `sources/mod.rs` even says so in a comment.
Locally it is a warning; `clippy -D warnings` makes it an error. This is the
third time a CI round trip has been spent on something `cargo clippy` would
have printed in fifteen seconds.

**Free claims per IP raised from 1 to 5 per day.** One is not a limit, it is a
single-shot; a household, an office or anyone behind CGNAT shares an address,
and the second person to try got told they had claimed too many times. The
hundred-copy cap on the Promo row is still the real ceiling — this only stops
one person spending it. Default raised in `packages/env` and `.env.example`
too, so a fresh deploy does not inherit the old number.

---

## Session 9 — analytics

**Google tag plus five events chosen to answer questions, not fill a dashboard.**

- `promo_view` (once per visit, from the CTA owning the `buy` anchor only —
  the landing page renders `PromoCta` twice and firing from both would halve the
  apparent conversion rate), `begin_checkout`, `purchase`, `checkout_blocked`,
  `download_link_resent`.
- `begin_checkout` and `purchase` use GA4's reserved names exactly, so they feed
  the built-in ecommerce reports instead of a custom-event list nobody opens.
- `purchase` fires when the key lands, not on the redirect: Dodo bounces back on
  `processing` too, and counting those inflates revenue with sales that never
  cleared. Guarded in `localStorage` by transaction id, because `/thanks` is a
  refreshable, bookmarkable URL.
- Everything routes through `lib/analytics.ts`, which no-ops when `gtag` is
  absent — SSR, pre-load, and every visitor with an ad blocker. Given who buys a
  Claude Code tool, that last group is not small, and none of it may throw
  inside a handler that also starts a checkout.

**Not verified:** no event has been observed arriving in GA4.
**Not built:** Consent Mode v2. Flagged, not done — it needs a banner and a
stored preference, which is a product decision.

---

## Session 8 — the promo counter did not count

**Two bugs with one root: the phase and the price lived in different systems and
nothing tied them together.**

- The counter only incremented on `totalMinor === 0`. The Dodo product was
  $14.99, so every "free" claim charged full price and the count never moved —
  the giveaway would have run forever. Now keyed off the offer the *checkout*
  recorded, with a loud `[promo] MISMATCH` when the two disagree (D-008).
- `--limit 1` had been applied to the wrong database. `DATABASE_URL` falls back
  to `apps/server/.env` (localhost), so a production command silently updated a
  laptop. The script now prints its target, and flags localhost.
- The production database is only reachable from inside the deployment, so
  `POST /api/promo` was added behind the admin token — same operations as the
  CLI, run by the server that is already in there. Every call logs before/after,
  because this is the one endpoint that changes what visitors are charged and it
  leaves no other trace.
- Rate limits doubled. They are keyed per IP, and everyone behind one CGNAT or
  office proxy shares a bucket, so a limit sized for one person is a quarter of
  that for four.

---

## Session 7 — the seven commands that were never wired

**`tsc`, `clippy -D warnings` and `cargo fmt` all passed on code that could not
work.**

`session_collapse`, `sessions_close_stale`, `surface_visible`,
`surface_set_visible`, `surface_snap`, `autostart_enabled` and `autostart_set`
were all defined with `#[tauri::command]` and left out of `invoke_handler`.
Every call would have failed at runtime with "command not found": the collapse
counter, the surface toggles, "start with the machine", snap-on-drag-release.
Found by a grep that a verification step asked for, not by any tool.

**The lesson worth keeping:** every check in this project passed. The gap was
between two lists that no check compared. That is Pillar 6, and it now has a
script.

Also: a fix of mine duplicated seven TypeScript wrappers that already existed on
the other branch, producing 14 `TS2451` redeclarations after the merge. I had
grepped one branch and assumed the other matched.

---

## Session 6 — the marketing site, and the launch promotion

- Every section rebuilt from `designs/site/landing.html`: the hero band (sky,
  three stepped clouds, hill clip-path, two-tone grass, two tuft rows, her
  22-second patrol), three parchment pillars, four dusk state cards, four sky
  ritual rows, grass price band.
- Responsive via a new `Sheet` in `packages/ui`, built from the three rules
  rather than a library default, with a real dialog underneath so focus
  trapping and Escape work.
- The three-phase launch: free → 72h at $4.99 → list. Live over SSE with one
  shared poller (a query per subscriber would turn launch day into a
  self-inflicted load test), polling fallback after three stream failures.
- Copy rewritten to sell outcomes and to call Jule a her — not "the desktop
  agent", not "pet".

**Divergence:** the design's headline was "Your context window, with a pulse."
Replaced with "Never lose a good session again." The design's line describes the
mechanism; the owner asked for outcomes. Reversible in `page.tsx`.

---

## Session 5 — no discount codes

Reversed the earlier design (D-005). Several of the places this gets posted do
not allow promo codes, and a code is a second thing that can be wrong. The
product's price is now the price, edited by hand as the launch moves. This is
what later produced the session-8 counter bug — the two halves of "what does
this cost" were now in different systems.

Also: Resend replaced with nodemailer over SMTP (D-009).

---

## Session 4 — the backend nobody could have used

**Nothing wrote a `Release` row.** CI uploaded installers to R2 and
`/api/downloads/latest` answered "there is no published build yet" —
permanently. Every download link in every purchase email resolved to nothing.

Also found: `if: ${{ secrets.R2_ACCOUNT_ID != '' }}` — GitHub does not expose
the `secrets` context to a step's `if`. It evaluated to `'' != ''`, so the R2
upload step had never run and never would. Verified against GitHub's context
availability table rather than assumed.

---

## Sessions 1–3 — foundation, screens, context reading

Scaffold, design system, all desktop screens from the archive, then the context
reader (D-001) and the desktop app's features: patrol, wardrobe, onboarding,
cosmetics, the SQLite store, five windows, tray.

**Fixed in passing:** `loadStateFor(Infinity)` returned `"fresh"`. `!isFinite()`
is right for NaN and backwards for +Infinity — a runaway count is the *most*
alarming reading there is. Caught by the very first test run, which is the
argument for writing them.
