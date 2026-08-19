# ContextJule — what this is

A desktop pet that reads your AI context window and visibly carries the weight.

Context length is the one number that decides whether a Claude Code or Codex
session is going well, and nothing shows it to you. Jule lives on the desktop,
watches how much context the session is carrying, and carries it herself. Three
thousand tokens in she is standing tall with a small pack. A hundred and twenty
thousand in she is face down under a tower of scrolls, asking whether you want
to start fresh. Click once and the pack hits the floor.

## The shape of it

| Piece | What it is |
|---|---|
| `apps/desktop` | Tauri v2 + React. Five windows. The product. |
| `apps/web` | Next.js 16 marketing site, checkout, thanks, download |
| `apps/server` | Hono on Bun. Dodo webhooks, licensing, releases, the promo counter |
| `packages/core` | Framework-free domain model. Pure functions, all the tests |
| `packages/ui` | React components + the sprite engine, shared by desktop and site |
| `packages/db` | Prisma 7 + Postgres. Payments and licensing only |
| `packages/env` | Two schemas: server (secrets) and web (one variable) |
| `designs/` | The design archive. Sprite engine, icons, screen HTML, landing HTML |

## Non-negotiables

1. **Everything about a session stays on the machine.** She reads local CLI
   transcripts. No session text ever leaves the computer, no API key is ever
   asked for, no extension is installed.
2. **She never types into your chat.** She watches and reacts. The cleanse
   copies `/clear` to the clipboard and says so — it cannot clear a real chat
   and does not pretend to.
3. **One price, no subscription, no account.** A licence key by email. The key
   is what unlocks the app; the download link only protects bandwidth.
4. **The design archive outranks prose.** Gold `#f0b13f` once per screen, 3px
   borders, hard-offset shadows only, `--radius: 0`, whole-number sprite
   scaling, no anti-aliasing, no colour outside the 40-entry palette.
5. **She must never be the thing that interrupts you.** Every nudge is
   suppressible, she sleeps when idle, and she says each thing once per session.

## The launch

$14.99 list. First 100 copies free, then 72 hours at $4.99, then list price.
The phase lives in a `Promo` row the server owns; the price lives in the Dodo
product and is edited by hand. There are no discount codes — several of the
places this gets posted do not allow them.
