# Changelog

Newest first. This is where the **reasoning** lives — git has the file list.

---

## Session 17 — Cowork, and a correction

**I was wrong last session.** "The Claude desktop app keeps conversations
server-side and writes no transcript" is true of the web app and of cloud
Cowork sessions, and false of the desktop app in local mode. Anthropic
documents the layout: `local-agent-mode-sessions/` for Cowork and Chat, and
`claude-code-sessions/` for Code sessions — the latter described as the *same
per-session layout* Claude Code uses everywhere else.

So `ClaudeCodeSource` now reads every root it knows of, not just
`~/.claude/projects`: `%LOCALAPPDATA%\Claude`, `%APPDATA%\Claude` and the
`Claude-3p` variants on Windows, `~/Library/Application Support/Claude` on
macOS, `$XDG_CONFIG_HOME/Claude` elsewhere — each `claude-code-sessions/`, kept
only if it exists.

**Adding a candidate root cannot break a reader**, which is why this is safe to
ship before anyone has confirmed the format on a real machine. `find_files`
only returns `.jsonl`; every line that does not parse into something the reader
recognises is skipped; a directory holding a different shape produces no
readings rather than wrong ones. Worst case it finds nothing and the app
behaves exactly as it did. `available()` now means *any* root exists rather
than the terminal's specifically, and `root()` is explicitly a label for the
settings card, not the source of truth.

**Cloud Cowork cannot be read at all, and the app says so.** A cloud session's
agent loop runs on Anthropic's infrastructure and is saved to the account;
there is no file on the machine. The sources card now states which transcripts
she reads and which never appear — permanently, not only in the empty state.
Somebody working in Cowork all afternoon watching a meter that never moves will
conclude the app is broken, and the app is not broken.

**Unverified, and named as such:** whether the desktop app's
`claude-code-sessions/` really carries `message.usage` per assistant entry.
That is the one thing the documentation does not say, it decides whether any of
this produces a reading, and it needs a probe on a machine that has the
directory. Written ≠ runs.

---

## Session 16 — six bugs, four of them invisible

Started from the multi-session question and did not stop there.

**1. She followed the wrong chat, and often none.** `useCurrentSession` asked
for one row `ORDER BY started_at DESC LIMIT 1` and *then* checked whether it
was live. Filtering after a LIMIT can only throw away the answer: whenever the
most recently opened session was a finished one, she reported nothing running
while a four-hour session sat there moving. And "most recently started" is the
wrong sort anyway — opening a second terminal for a quick question made her
abandon the session that mattered. Now `session_current` in SQL: filter, then
sort by `updated_at`, then limit. The one that is moving is the one being
written to.

**2. She went blind on any session anyone left for lunch.** The janitor closes
sessions idle for thirty minutes. Nothing ever reopened one — `session_upsert`
kept updating `last_tokens` on a row it had marked finished, so the resumed
session could never be current again. The long, heavy sessions worth watching
are exactly the ones that get left for lunch.

A write is now proof of life. Reopening also pushes `started_at` forward by
exactly the idle gap, so time-together counts the time someone was in the
session and not the three days the window sat open behind a lock screen.
Verified against SQLite directly: a session resumed after three hours reports
one minute of elapsed time, which is what it had.

**3. The sessions screen's "all" toggle did nothing.** `useAsync` built
`reload` with `useCallback(..., [])` around a loader that closes over its
arguments — so it kept calling the first one forever. Switching to "all"
changed `since` and `limit` and then re-ran a closure holding the old values.
The loader is in a ref now and the effect keys off the arguments. `reload` is
still stable, which it has to be: it is handed to an event listener.

**4. An event listener leaked on every unmount.** `listen()` resolves a tick
later than cleanup runs, so the handle arrived after the component was gone and
nothing ever unregistered it. Five windows opening and closing surfaces all day
makes that a leak rather than a curiosity.

**5. Snapping was wrong on a second monitor.** `snap_to_edge` compared window
positions against `monitor.size()`, which is an extent, not a rectangle. Every
coordinate is in the virtual desktop, where a second screen starts where the
first ends and can start at a negative x — so a mini bar parked on the second
monitor snapped to the primary one's coordinates and flew across the desk.
`monitor.position()` was the missing origin.

**6. Two buttons could stick disabled forever.** The licence card set `busy`
true, awaited, and set it false as a separate statement. `deactivate` does not
catch — it throws straight through `ipc.call` — so one failed update check or
one offline release left both controls dead for the rest of the session,
including the one that frees the machine. try/finally, the way `SourcesCard`
already did it. `Activate` was checked and is safe: it catches internally.

**Migration 0002** rather than a line added to 0001. An install that has run
0001 never runs it again, so editing it would give every existing database a
different schema from every new one. That is the whole reason the list is
append-only, and the index `session_current` needs had to go in its own entry.

---

## Session 15 — the count moves

**The reader cannot make the number arrive smoothly, because it does not
arrive smoothly.** Claude Code writes one `usage` block when an assistant
message *completes*, not while it streams — so a ninety-second reply lands as a
single jump of forty thousand tokens no matter how often the file is read.
Dropping the poll to 250ms would have learned the same number sooner and cost
four directory walks a second to do it. It is now 1s, and that is the honest
ceiling for the transcript path.

So the liveness went where the granularity actually is, and where it is free:

**The status line was invisible to the app.** It runs as a *separate process*
writing straight into the same SQLite file, on every render — by far the
finest-grained feed there is. Nothing in the app process could know when one of
those writes landed; the windows only refreshed because the transcript reader
happened to see the same turn a moment later. `spawn_store_watcher` polls one
`MAX(updated_at)` every 400ms and emits `session-updated` when it moves,
whoever moved it. Cheaper than a filesystem watcher on the database, and it
cannot miss an edit the way a debounced watcher can — the number either changed
or it did not.

The writer thread no longer emits. One event path for both writers beats two
that fire twice for the same change.

**`useCountUp`.** The number rolls to where it landed and the meter fills
behind it, twelve frames over 600ms, eased out so a big jump reads as a lurch
that settles rather than an odometer at constant speed. Quantised, not a 60fps
tween: the digits are a pixel font and a smooth interpolation spends most of
its frames drawing glyphs the font has no shape for.

**Display only, and this is the important part.** Her load state, her pose,
every threshold and every reaction still read the raw count. Tweening the value
she reacts to would delay the reaction — which is the whole product. The label
says "heavy" the instant she is; the count catches up behind her. Snaps on
first paint (opening onto a busy session is not a journey), on sample readings,
and under `prefers-reduced-motion`.

---

## Session 14 — the first installer, an honest button, and some motion

**The release pipeline ran.** `ContextJule-Setup.exe`, `ContextJule.dmg`,
`ContextJule.app.tar.gz`, both signatures and `latest.json` are in R2. Four
sessions of open item 1 closed.

**"Help her carry this" was disabled, not broken.** Every surface gated it on
`!jule.session`, and until session 13 nothing ever created a session — so on a
machine with the status line uninstalled it was permanently greyed out, which
reads as a dead button rather than a waiting one. Worse, the four surfaces did
different things: only the home screen copied `/clear`; the panel, the tray and
the mini bar played the dump animation and recorded a cleanse, and the panel's
label said *clear context* while the tray's said *clear*, neither of which any
window can do from outside the tool.

The hand-off moved into `jule.cleanse()`, so there is one behaviour: copy the
command, confirm it, record the cleanse if there is a session to record it
against. Not gated on a session any more — the clipboard is just as useful
before she has found anything to watch, and that is exactly when a disabled
control looks broken. `handedOver` on the controller holds the confirmation for
four seconds so every surface can say the same thing without four copies of the
same `setTimeout`.

**Divergence from the design sheets:** panel `clear context` ‒ `copy /clear`,
tray `clear` ‒ `copy /clear`. Both sheets were drawn before it was settled that
clearing someone else's context is not reachable. Home and mini bar keep *help
her carry this*, which promises nothing it cannot do.

**Motion, stepped rather than eased.** `cj-screen-in` on the four tab screens,
`cj-row-in` with a capped stagger on sessions, nudges, stat tiles and the
wardrobe, `cj-press` as the one press every control shares, and a single
`cj-pop` on the home caption when the clipboard hand-off lands. All `steps()`:
she is pixel art at whole-number scale, and a 60fps ease-out slides artwork
across fractions of a pixel, which is the one thing the render pipeline exists
to avoid. All of it behind `prefers-reduced-motion: no-preference`, with the
resting state as the final frame, so nothing depends on an animation running.

**Favicon.** RealFaviconGenerator's files sit in `apps/web/src/app` and
`public/`. No `<link>` tags: `favicon.ico`, `icon0.svg`, `icon1.png`,
`apple-icon.png` and `manifest.json` are App Router file conventions and Next
emits the markup itself. The one tag the convention cannot express —
`apple-mobile-web-app-title` — is `appleWebApp: { title }` in the metadata.
`capable` is left unset on purpose; it strips Safari's chrome from a saved page,
and this is a marketing site, not an app shell.

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
