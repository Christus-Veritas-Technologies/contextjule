# START HERE

You are picking up **ContextJule**, a desktop pet that reads your AI context
window and visibly carries the weight. This file is self-contained.

> Read `AGENT-WORKFLOW.md` first — that is *how* work is done here.
> This file is *what* to build next.

Last updated: end of session 9. Branch: `dev`.

---

## The rule that comes before everything else

**Every screen you build, you build from its design file.** The archive is in
`designs/`, and the precedence ladder is:

| Rank | Source | Authority |
|---|---|---|
| 1 | `designs/screens/*.html`, `designs/site/landing.html` | What a screen looks like |
| 2 | `systems/*` and `designs/README.md` | Why, and rules spanning screens |
| 3 | `packages/ui/src/styles/globals.css` | A convenience for shared values |
| 4 | Anything else | Nothing |

The design HTML files are bundler-wrapped. Extract the real markup with:

```bash
python3 -c "
import re,json
src=open('designs/site/landing.html',encoding='utf-8').read()
m=re.search(r'<script type=\"__bundler/template\">(.*?)</script>',src,re.S)
open('designs/site/landing.extracted.html','w',encoding='utf-8').write(json.loads(m.group(1)))"
```

**The concrete failure that proves the rule.** Four places where a systems rule
and the design sheet disagreed were found only by opening both. Each was
resolved with a named override prop rather than by picking a side (D-014). If
you build from `globals.css` alone you will produce something self-consistent
and wrong.

**Registered exceptions:** the four in D-014. There are no others. If you find a
fifth, stop and ask — do not resolve it silently.

---

## Your task

Nothing is half-written. Pick in this order:

1. **Run the release pipeline once.** Nothing has ever produced an installer.
   Push `dev` → `main` and watch. Expect the first run to find something.
2. **Consent Mode v2 for the Google tag.** EEA visitors are a matter of when.
   Currently the tag fires unconditionally.
3. **Presigned artifact URLs**, if the download token is meant to mean
   anything. Against a public R2 bucket the signature is decorative — see
   "Read this before you write a line".
4. **The From/auth domain mismatch** (below). It will silently spam-folder the
   one email that carries the licence key.

---

## What ContextJule is, in five rules

1. Everything about a session stays on the machine. No API key, no extension.
2. She never types into your chat.
3. One price, no subscription, no account. The key unlocks the app.
4. The design archive outranks prose. Gold once per screen, 3px borders,
   hard-offset shadows, no radius, whole-number sprite scaling.
5. She must never be the thing that interrupts you.

---

## What is already built

Read the verbs precisely. **Written ≠ typechecks ≠ runs ≠ verified in
production.**

| Area | State |
|---|---|
| `packages/core` | **Verified.** 114 tests. Pure functions: load states, behaviour, patrol, reactions, transitions, cosmetics, promo phases, format. |
| `apps/server` | **Runs in production.** 57 tests, pure layers only. Full purchase loop confirmed live: checkout → Dodo → webhook → licence key → thanks page. |
| `apps/web` | **Builds and deployed.** Landing, thanks, download. Never audited against `designs/site/landing.html` since the copy rewrite. |
| `apps/desktop` | **Builds only.** `tsc` and `vite` pass, `cargo fmt`/`clippy` pass. **Has never been run against a real Tauri host end to end.** |
| Release pipeline | **Never run.** Secrets are set, updater key generated, `createUpdaterArtifacts` enabled. Unproven. |
| macOS | **Nothing has ever been built or run on it.** |

---

## Read this before you write a line

These look fine and are not.

- **`cargo fmt --check` and `pnpm lint` only fail in CI.** Nothing locally forces
  them. Run both before pushing or you will burn a CI round trip.
- **Seven Tauri commands were defined and never registered** in
  `invoke_handler`. They compiled clean; `clippy -D warnings` and `tsc` both
  passed; every call would have failed at runtime with "command not found". The
  check is a script that diffs `#[tauri::command]` against the handler list.
  **Re-run it whenever you add a command.**
- **The download token is decorative against a public R2 bucket.** R2 ignores
  the query string, so `?expires=&signature=` gates nothing. Acceptable by
  design — the licence key is what gates the product — but do not describe it as
  protection.
- **`EMAIL_FROM` and `SMTP_USER` are on different domains.** SPF and DKIM are
  published for the domain you authenticate as. Unfixed, the purchase email
  either bounces or lands in spam.
- **The bridge cannot write `.env` or `.github/workflows/`.** Those two are
  always manual. A workflow "fix" that was never applied cost a full debugging
  cycle.
- **Prices are in `@contextjule/core/pricing`, not env** (D-018). Do not add a
  `NEXT_PUBLIC_*_PRICE` back.

---

## How to work here

- One todo, one commit. Plan file first if the plan is wrong.
- Cite decisions by number: `// never reopens a closed giveaway (D-007)`.
- Changelog entry before rewriting this file.
- PowerShell is the owner's shell: **no `&&`**, one command per line.
- Commands run from the repo root unless stated.

---

## Where things are

| Path | What | Tracked |
|---|---|---|
| `designs/` | The archive. Sprite engine is the only unregenerable file. | yes |
| `plans/`, `systems/`, `progress/` | Working notes | **gitignored** |
| `apps/*/.env` | Secrets | gitignored, bridge-blocked |
| `.github/workflows/` | CI + release | tracked, bridge-blocked |
| `~/.tauri/contextjule-updater.key` | Updater private key | **outside the repo** (D-020) |

---

## Open items, in priority order

1. Release pipeline has never run. Everything about distribution is unproven.
2. Desktop app has never been exercised against a live Tauri host.
3. `EMAIL_FROM` domain does not match the authenticated SMTP domain.
4. No Consent Mode; EEA analytics consent is unhandled.
5. Dodo product price is $14.99 while the phase says free — the mismatch logger
   exists precisely because of this, and it should read $0 during the free run.
6. macOS entirely unverified.

---

## The test

**It is 2am, they are four hours into a session that is finally going well, and
the window is about to fill.** Does what you built tell them in time to save the
thread — without being the thing that broke their concentration?

If a change makes her louder, more frequent, or more likely to be wrong at that
moment, it is the wrong change however good it looks in a screenshot.
