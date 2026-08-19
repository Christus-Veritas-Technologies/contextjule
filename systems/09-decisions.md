# Decisions

Numbered, immutable, cited by number in code comments. When a decision is
reversed, add a new one that says so — do not edit the old one.

---

**D-001 — Context is read from local CLI transcripts, not an API.**
Claude Code writes `~/.claude/projects/<project>/<session>.jsonl` with a
`message.usage` block; Codex writes `~/.codex/sessions/` with a cumulative
`token_count` (occupancy is the *delta*). Claude Code's status line is also a
supported interface and gives an exact `context_window_size`. Both are shipped:
transcripts need no setup and carry history, the status line is exact and is one
click. Neither needs an API key, which was the constraint that ruled out
everything else.

**D-002 — SQLite is compiled into the binary; SQL never crosses IPC.**
`rusqlite` with `bundled`. The webview calls typed Tauri commands only, so it
cannot be talked into running a query and the local schema can change without
touching TypeScript.

**D-003 — Dodo Payments is the only processor and the only licence issuer.**
Its `licenses/activate|validate|deactivate` endpoints are public and need no
key, which is what lets the desktop app verify a purchase with no server of ours
in the path.

**D-004 — Licence validation is three-tier: our API, then Dodo direct, then the
cached row inside a seven-day grace.** A paid customer on a plane keeps working.
Seven days is long enough to survive a flight and bad hotel wifi, short enough
that a refund takes effect within a working week.

**D-005 — No discount codes. The Dodo product's price is the price.**
Several of the places this gets posted do not allow promo codes, and a code is a
second thing that can be wrong: it can expire, be capped, be copied into a
thread, or silently not apply. Reversed the earlier design that used a 100%-off
code with a usage cap.

**D-006 — The launch phase is decided by the server, never the client.**
`POST /api/checkout` re-resolves the phase and returns 409 `offer_moved` if the
page disagrees. The browser renders what it is told; it never decides a price.

**D-007 — `freeClosedAt` is stamped once and never cleared.**
A refund that drops the claimed count back under the limit must not reopen a
giveaway that has already been announced as over — someone who paid $4.99 an
hour earlier would be right to be annoyed.

**D-008 — A free claim is counted by the offer the site promised, not only by a
zero amount.** The phase lives in our row and the price lives in the Dodo
product; keying only on `totalMinor === 0` meant that if the product had not
been zeroed, every "free" claim charged full price and the counter never moved.
The mismatch is now logged as an error, because a customer has been billed for
something the page called free.

**D-009 — Email goes over plain SMTP through nodemailer, not a provider SDK.**
The purchase email is the most important thing the backend sends; SMTP means it
moves between providers by editing five environment variables instead of by a
deploy.

**D-010 — Credentials are verified at boot, and a failure is never fatal.**
A bad SMTP password used to surface as an email that never arrived. A server
that refuses to boot over SMTP also stops licence validation for every existing
customer, which is a far worse outage than delayed purchase emails.

**D-011 — CI runs on `main` only. No `pull_request` trigger.**
A `pull_request` event fires on the merge commit of PRs targeting main, so every
push to a feature branch with an open PR ran the full suite — the exact thing
gating on main was meant to avoid. Cost, stated plainly: a broken merge is
caught after it lands.

**D-012 — Branch model is feature → dev → main.** Only `main` builds installers.

**D-013 — One commit per todo.** A feature is 1–10 todos. Shared SHAs are
allowed when three todos are three requirements on one file written once.

**D-014 — Where the design archive and a systems rule disagree about
appearance, the design wins — via an explicit override prop.**
Four such conflicts were found and each got a named prop (`filled`, `accent`,
`fraction`) so the screen matches the sheet exactly while the domain model stays
correct. Registered here rather than resolved silently.

**D-015 — Sprite frames are `box-shadow` stacks on one element.**
Zero image requests, whole-number scaling only, and the browser can never
resample pixel art. Mirroring flips a *copy* — the engine's `mirror` is in-place
and strips are cached, so flipping the cached grid would flip her permanently on
the second pass.

**D-016 — Animation reads the wall clock, not a frame counter.**
`requestAnimationFrame` is throttled to nothing in a background tab or a hidden
Tauri window, and a counter would strand her mid-step. A sparse tick still lands
on the right pose, and independent windows stay in step without talking.

**D-017 — Every load-state crossing gets one beat, gated and settled.**
One reaction for where she landed, not one per band crossed. A 1.8s cooldown —
proven by test to outlast the longest transition reaction — stops a count
flickering on a boundary from making her twitch. Every reaction ends into the
neutral idle loop for 400ms rather than snapping to a static pose.

**D-018 — Prices live in `@contextjule/core/pricing`, not the site's env.**
A price baked into the site's build disagrees with the checkout the moment
either changes, and the customer is the one who finds out.

**D-019 — `NEXT_PUBLIC_GA_ID` is optional; unset means no tag is rendered.**
Development and preview builds would otherwise report into the property the real
numbers live in.

**D-020 — The updater signing key is generated outside the repository.**
Whoever holds it can sign an update every installed copy will trust and apply
without asking. That is closer to a remote code execution primitive than a
credential. `.gitignore` patterns are the second line of defence, not the first.
