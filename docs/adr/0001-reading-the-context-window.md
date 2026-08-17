# 0001 — How ContextJule reads the context window

Status: accepted — source layer and the Claude Code source implemented
Date: 2026-08-17

## The problem

The whole product is one number: how many tokens the user's current AI session
is carrying. Nothing else in the app matters if that number is wrong, missing,
or arrives with a permission prompt attached.

`designs/README.md` says the product "reads session length on the machine" and
never says how. This document picks how.

## Constraints

1. **Local-first.** The number is computed on the user's machine.
2. **Self-contained.** Everything ships inside the executable. No second
   artifact to install, no runtime to find.
3. **No API key from the user.** Explicitly ruled out.
4. **Complexity is ours to absorb.** Hard on our side is fine if it buys
   simplicity on theirs.
5. **UX is the deciding factor.** This is a $4.99 desktop pet. A scary
   permission prompt costs more than the feature is worth.

## Two separate questions

**Fidelity — what is the best number available?**

| | Source | Accuracy |
|---|---|---|
| A | The provider's own `usage` accounting | Exact |
| B | Full conversation text + a correct tokenizer | Close; misses system prompt, tools, attachments |
| C | *Visible* conversation text + a tokenizer | Badly undercounts — message lists are virtualised |
| D | Byte sizes of encrypted traffic | A guess |

Note that B is not as good as it sounds. Anthropic publishes no tokenizer, so B
means estimating at roughly 3.7 characters per token and being quietly wrong by
a margin that grows with the conversation. **Any option that reaches A is worth
far more than any option that reaches B.**

**Access — where can our process stand to see it?**

Inside the page · between browser and network · beside the browser · on top of
the browser · under the browser (its files on disk) · replacing the browser ·
beside the model.

## Options considered

### 1. Local CLI transcripts — *chosen, ship first*

Claude Code appends a JSONL transcript per session under `~/.claude/projects/`,
with the project path URL-encoded into the folder name. Every assistant entry
carries `message.usage`:

    input_tokens · cache_read_input_tokens · cache_creation_input_tokens · output_tokens

Their sum on the most recent assistant turn **is** the context occupancy, from
Anthropic's own accounting. Codex does the same under `~/.codex/sessions/`, with
cumulative `token_count` events.

- Fidelity: **A — exact.** No tokenizer, no estimate.
- Access: reading files the user already owns, in their home directory. Not a
  TCC-protected path on macOS, so **no permission prompt on any platform**.
- Self-contained: a filesystem watch in Rust. Nothing to install.
- UX friction: **zero.** It works the moment the app opens.
- Weakness: only covers CLI tools, not claude.ai in a browser. Formats are
  undocumented and can change — but they are append-only JSONL, so a parser
  that skips unrecognised lines degrades rather than breaks.

The design's own mock session names — "API auth refactor", "Tauri tray icons" —
read exactly like Claude Code projects. This audience is not an afterthought.

### 2. Local proxy for API and SDK traffic — *chosen, ship second*

Run an HTTP listener on localhost. The user points `ANTHROPIC_BASE_URL` or
`OPENAI_BASE_URL` at it; we forward upstream and read the `usage` block out of
the response, including the SSE `message_delta`.

- Fidelity: **A — exact.**
- Access: the client opts in with an environment variable. **No certificate
  authority is involved** — the inbound hop is plain HTTP to localhost and we
  make the outbound TLS connection ourselves. This is the crucial difference
  from option 6.
- No API key from us: their tool already has one; we forward the header
  untouched and never store it.
- UX friction: one environment variable, which we can write into a shell
  profile with one click and explain in one sentence.
- Covers: Cursor, Aider, Zed, custom scripts, anything with a base URL setting.

### 3. Jule's window — *chosen, ship third*

An app-owned Tauri webview pointed at claude.ai or chatgpt.com, with an injected
init script hooking `fetch`/`XHR` and reporting to Rust over IPC.

- Fidelity: **A — exact**, assuming the streamed response carries `usage` the
  way the public API does. *Verify against one live session before building.*
- Access: our own webview. No CA, no extension, no accessibility permission.
- Self-contained: entirely inside the executable.
- UX friction: **real and significant.** The user has to chat in our window
  rather than their browser. Login lives in a separate cookie jar; passkeys need
  checking.
- Precedent: Claude Desktop and ChatGPT Desktop proved people will adopt a
  dedicated window. It also makes her genuinely present rather than peering in
  from outside.
- Open question: whether instrumenting those sites in a third-party webview sits
  within Anthropic's and OpenAI's terms. **Legal, not technical. Answer first.**

### 4. Browser extension + native messaging — *deferred*

The boring, supported, high-fidelity answer for browser users. A content script
sees the real request payloads and talks to the app over native messaging, whose
host manifest the installer registers.

- Fidelity: **A.** UX friction: one "Add to Chrome" click.
- **Breaks constraint 2** — it is a second artifact, published in a store, that
  cannot be side-loaded from inside the executable. Chrome closed that door on
  Windows; Firefox requires signing.
- Worth revisiting if browser coverage turns out to matter more than the
  self-contained rule. It is the smallest possible violation of it.

### 5. Accessibility APIs (UIA / AX) — *rejected*

- Fidelity: **C.** Message lists are virtualised, so only visible turns exist in
  the tree. History cannot be read, only accumulated forward — and a missed
  event is a permanent drift with no way to detect it.
- Forces Chrome into accessibility mode, which measurably slows the renderer for
  an app that runs all day.
- macOS needs an Accessibility grant. Tolerable on its own; not worth it for a
  number this poor.

### 6. Local MITM proxy with a generated root CA — *rejected*

- Fidelity: **A.** Technically sound; it is what Proxyman and Charles do.
- "Install a root certificate" is the single scariest thing you can ask a
  non-technical buyer to do. EDR flags it, MDM blocks it, and certificate
  pinning in the desktop clients defeats it.
- The trust cost dwarfs a $4.99 pet. Rejected on UX, not on capability.

### 7. Chrome DevTools Protocol — *rejected, not viable*

Chrome 136 and later refuse `--remote-debugging-port` when the default
user-data-dir is in use, so there is no way to attach to the profile people
actually browse in.

### 8. Reading the browser's or client's own storage — *rejected*

LevelDB and IndexedDB caches are private formats that change without notice,
are locked while the app runs, and are encrypted at rest via DPAPI or Keychain.
A permanent reverse-engineering treadmill for a number we can get exactly by
other means.

### 9. Estimating from traffic size — *rejected*

Requires a packet capture driver, which is an external dependency and an admin
prompt, and yields fidelity **D**.

### 10. Becoming the chat client — *rejected*

Perfect fidelity, no permissions, and a completely different product from the
one in `designs/`.

## Decision

**Do not pick one. Build a source layer and ship three.**

    trait ContextSource {
        fn id(&self) -> &'static str;
        fn available(&self) -> bool;          // is this source usable right now
        fn start(&mut self, tx: Sender<Reading>) -> Result<()>;
    }

    struct Reading {
        session_key: String,   // stable per conversation
        source: &'static str,
        title: Option<String>,
        model: Option<String>,
        window_size: u32,
        tokens: u32,           // occupancy, not cumulative spend
        at: i64,
    }

Every source emits the same `Reading`; `store::session_upsert` already accepts
exactly this shape, and the behaviour engine already consumes it. Nothing above
the source layer changes when a source is added.

Ship order, by friction-to-value:

1. **CLI transcripts.** Zero friction, exact, covers the audience the design's
   own mock data describes. This is the launch feature.
2. **Local proxy.** One environment variable, exact, covers every API tool.
3. **Jule's window.** Real friction, exact, covers browser users — and only
   after the terms question is answered.

Settings gains a "where she watches" section listing detected sources, so the
user can see why she is or is not reading anything. That screen is also the
honest answer to "it does not work": it says which sources were found.

## Consequences

- The app is useful on first launch for anyone running Claude Code or Codex,
  with no setup at all.
- Browser-only users get nothing until step 3, and the marketing site must not
  imply otherwise before then.
- Three parsers to maintain against undocumented formats. Mitigation: skip
  unrecognised lines, never hard-fail, and surface "source stopped reporting"
  rather than silently showing a stale number.
- `window_size` still has to be inferred from the model name. `contextWindowFor`
  in @contextjule/core already does this and is the one estimate that remains.

## Answered since

### Paths — settled

Claude Code's own documentation states it: transcripts are JSONL at
`~/.claude/projects/<project>/<session-id>.jsonl`, where `<project>` is the
working directory with non-alphanumeric characters replaced by `-`, truncated
to 200 characters with a hash appended when longer. `~` resolves to
`%USERPROFILE%` on Windows, so there is no separate Windows path to special-case.
`CLAUDE_CONFIG_DIR` moves the whole root and is honoured. Transcripts are kept
30 days by default (`cleanupPeriodDays`) and can be suppressed entirely with
`CLAUDE_CODE_SKIP_PROMPT_HISTORY`, so their absence is a supported state, not a
bug. Codex writes to `~/.codex/sessions/`.

### A better interface than any of the above

The same documentation carries a warning worth taking seriously: *"the entry
format is internal to Claude Code and changes between versions, so scripts that
parse these files directly can break on any release."* It then points at the
supported alternative — and the **status line** turns out to be exactly what
this product needs.

Claude Code runs a configured command on every render and passes it the session
as JSON on stdin. That payload contains:

    context_window.total_input_tokens    "tokens currently in the context window"
    context_window.context_window_size   the window itself
    context_window.current_usage         input / output / cache_creation / cache_read
    model.display_name · session_id · session_name · cwd · workspace.git_branch
    cost.total_cost_usd · exceeds_200k_tokens · rate_limits

`total_input_tokens` is defined by the docs as the sum of `input_tokens`,
`cache_creation_input_tokens` and `cache_read_input_tokens` — the exact number
this app exists to display, computed by Claude Code itself. `context_window_size`
removes the last estimate in the whole system: `window_size_for()` is no longer
guessing from a model name.

So ContextJule registers **itself** as the status line command, in a
`--statusline` process mode that writes the reading to the local SQLite and
prints a Jule-coloured context bar back to the terminal. The user gets a status
line; we get exact numbers through an interface meant for this.

Both paths ship. The transcript reader needs no setup and can see history, which
is what fills the sessions screen on first launch; the status line needs one
click and reports the live turn with `CONFIDENCE_EXACT`, which wins on conflict.
An existing `statusLine` command is preserved, chained and restored on uninstall.

### claude.ai's streamed `usage` — still unverified

Not answerable from public documentation. The public Messages API emits
`message_start` with `usage.input_tokens` and `message_delta` with
`usage.output_tokens`; claude.ai's own endpoint is undocumented, and the only
sources describing it are unofficial reverse-engineering projects this decision
will not rest on. It needs one observed session to settle.

Its urgency dropped sharply, though. The status line covers the audience the
design's mock data describes, exactly, through a supported interface — so
option 3 is now a coverage question for browser-only users rather than the
critical path.

## Still open

Whether Anthropic's and OpenAI's terms permit an app-owned webview that
instruments the page. Legal, not technical. Answer before writing any of
option 3.
